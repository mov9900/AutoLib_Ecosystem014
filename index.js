const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

// Helper: add days to a Date
function addDays(date, days) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return admin.firestore.Timestamp.fromDate(d);
}

// Create a check-in (0 = in). Callable from authenticated client.
exports.checkIn = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required.');

  const uid = context.auth.uid;
  const enrollment = data.enrollment || null;
  const now = admin.firestore.Timestamp.now();

  const userRef = db.collection('users').doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) throw new functions.https.HttpsError('not-found', 'User not found.');

  // Cooldown: prevent check-in if currently in cooldown doc active
  const cooldownRef = db.collection('cooldowns').doc(uid);
  const cooldownSnap = await cooldownRef.get();
  if (cooldownSnap.exists && cooldownSnap.data().active) {
    const cooldownEnd = cooldownSnap.data().cooldownEnd.toDate();
    if (cooldownEnd > new Date()) {
      throw new functions.https.HttpsError('failed-precondition', 'Cooldown active.');
    }
  }

  // Write checkin document
  const checkinDoc = {
    userId: uid,
    enrollment,
    status: 0, // 0 = checked in
    timestamp: now
  };

  await db.collection('checkins').add(checkinDoc);
  // update users collection flag
  await userRef.update({ isInsideLibrary: true });

  // set cooldown record: active true until (now + cooldownPeriod) so scanner ready for others
  const cooldownPeriodSeconds = (data.cooldownSeconds || 60); // default 60s
  const cooldownEndTs = admin.firestore.Timestamp.fromMillis(Date.now() + cooldownPeriodSeconds * 1000);

  await cooldownRef.set({
    userId: uid,
    cooldownStart: now,
    cooldownEnd: cooldownEndTs,
    active: true
  });

  return { success: true, message: 'Checked in', cooldownEndsAt: cooldownEndTs.toDate().toISOString() };
});

// Check out (1 = out). Callable.
exports.checkOut = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required.');
  const uid = context.auth.uid;
  const now = admin.firestore.Timestamp.now();

  const userRef = db.collection('users').doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) throw new functions.https.HttpsError('not-found', 'User not found.');

  // Require cooldown to have started previously and maybe elapsed? According to your flow:
  // You want a cooldown between check-in and next check-out so scanner locks for that user for cooldownPeriod.
  // We'll enforce that checkOut can only happen if cooldownEnd <= now OR if user decides to manually check out (you can change).
  const cooldownRef = db.collection('cooldowns').doc(uid);
  const cooldownSnap = await cooldownRef.get();
  if (cooldownSnap.exists) {
    const cooldownEnd = cooldownSnap.data().cooldownEnd.toDate();
    if (cooldownEnd > new Date()) {
      // still cooling: do not allow check-out (as per your requirement)
      throw new functions.https.HttpsError('failed-precondition', 'Cooldown active. Try again later.');
    }
  }

  // create check-out record
  const checkoutDoc = {
    userId: uid,
    status: 1, // 1 = checked out
    timestamp: now
  };
  await db.collection('checkins').add(checkoutDoc);
  await userRef.update({ isInsideLibrary: false });

  // clear cooldown
  await cooldownRef.set({ active: false }, { merge: true });

  return { success: true, message: 'Checked out' };
});

/**
 * borrowBook
 * data: { bookId }
 * callable; enforces user authenticated, user isInsideLibrary true, book available
 * creates borrowedBooks doc with dueDate = borrowedAt + 15 days
 */
exports.borrowBook = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required.');
  const uid = context.auth.uid;
  const bookId = data.bookId;
  if (!bookId) throw new functions.https.HttpsError('invalid-argument', 'Missing bookId');

  const userRef = db.collection('users').doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) throw new functions.https.HttpsError('not-found', 'User not found.');
  if (!userSnap.data().isInsideLibrary) throw new functions.https.HttpsError('failed-precondition', 'User must be inside library to borrow.');

  const bookRef = db.collection('books').doc(bookId);
  const bookSnap = await bookRef.get();
  if (!bookSnap.exists) throw new functions.https.HttpsError('not-found', 'Book not found.');

  const book = bookSnap.data();
  if (book.available === false || book.status === 'borrowed') {
    throw new functions.https.HttpsError('failed-precondition', 'Book is not available.');
  }

  // create borrowed record
  const borrowedAt = admin.firestore.Timestamp.now();
  const dueDate = addDays(new Date(), 15); // 15 days

  const borrowedDoc = {
    bookId,
    userId: uid,
    enrollment: userSnap.data().enrollment || null,
    borrowedAt,
    dueDate,
    status: 'borrowed'
  };

  await db.collection('borrowedBooks').add(borrowedDoc);

  // update book status
  await bookRef.update({
    available: false,
    status: 'borrowed',
    borrowedBy: uid,
    borrowedAt: borrowedAt
  });

  return { success: true, message: 'Book borrowed', dueDate: dueDate.toDate().toISOString() };
});

/**
 * returnBook
 * data: { bookId }
 */
exports.returnBook = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required.');
  const uid = context.auth.uid;
  const bookId = data.bookId;
  if (!bookId) throw new functions.https.HttpsError('invalid-argument', 'Missing bookId');

  const bookRef = db.collection('books').doc(bookId);
  const bookSnap = await bookRef.get();
  if (!bookSnap.exists) throw new functions.https.HttpsError('not-found', 'Book not found.');

  const book = bookSnap.data();
  if (book.borrowedBy !== uid) {
    // Optionally allow admins to return on behalf. For now, require same user.
    throw new functions.https.HttpsError('permission-denied', 'This book is not borrowed by you.');
  }

  // create returned record
  const returnedAt = admin.firestore.Timestamp.now();
  const returnedDoc = {
    bookId,
    userId: uid,
    enrollment: book.enrollment || null,
    returnedAt,
    status: 'returned'
  };
  await db.collection('returnedBooks').add(returnedDoc);

  // update books collection
  await bookRef.update({
    available: true,
    status: 'available',
    borrowedBy: admin.firestore.FieldValue.delete(),
    returnedAt
  });

  // Optionally mark borrowedBooks record as returned (here we search and update)
  const borrowedQuery = await db.collection('borrowedBooks')
    .where('bookId', '==', bookId)
    .where('userId', '==', uid)
    .where('status', '==', 'borrowed')
    .limit(1)
    .get();

  if (!borrowedQuery.empty) {
    const bdoc = borrowedQuery.docs[0];
    await bdoc.ref.update({ status: 'returned', returnedAt });
  }

  return { success: true, message: 'Book returned' };
});

/**
 * markOverdue - scheduled: runs every day at 02:00 UTC (cron)
 * marks borrowedBooks where dueDate < now and status == 'borrowed' => sets status 'overdue'
 */
exports.markOverdue = functions.pubsub.schedule('0 2 * * *').timeZone('UTC').onRun(async (context) => {
  const now = admin.firestore.Timestamp.now();
  const q = db.collection('borrowedBooks').where('dueDate', '<', now).where('status', '==', 'borrowed');
  const snapshot = await q.get();
  const updates = [];
  snapshot.forEach(doc => {
    updates.push(doc.ref.update({ status: 'overdue', overdueMarkedAt: now }));
  });
  await Promise.all(updates);
  console.log(`Marked ${updates.length} overdue items.`);
  return null;
});
