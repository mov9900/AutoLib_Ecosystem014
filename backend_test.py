#!/usr/bin/env python3
"""
Backend API Testing for AutoLib Admin System
Tests all backend endpoints for functionality and data persistence
"""

import requests
import json
import base64
import uuid
from datetime import datetime

# Backend URL from frontend .env
BACKEND_URL = "https://6ac6ae55-d600-447d-ba8e-96874ea0a4df.preview.emergentagent.com/api"

class AutoLibBackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.test_results = []
        self.created_book_ids = []  # Track created books for cleanup
        
    def log_result(self, test_name, success, message, details=None):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name} - {message}")
        if details:
            print(f"   Details: {details}")
    
    def test_auth_login(self):
        """Test authentication login endpoint"""
        print("\n=== Testing Authentication Login ===")
        
        # Test with demo credentials
        login_data = {
            "email": "admin@autolib.com",
            "password": "admin123"
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/auth/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "user" in data and "token" in data:
                    self.log_result("Auth Login", True, "Login successful with demo credentials", 
                                  f"User: {data['user'].get('email')}, Token: {data.get('token')}")
                    return True
                else:
                    self.log_result("Auth Login", False, "Login response missing required fields", 
                                  f"Response: {data}")
                    return False
            else:
                self.log_result("Auth Login", False, f"Login failed with status {response.status_code}", 
                              response.text)
                return False
                
        except Exception as e:
            self.log_result("Auth Login", False, f"Login request failed: {str(e)}")
            return False
    
    def test_auth_profile(self):
        """Test authentication profile endpoint"""
        print("\n=== Testing Authentication Profile ===")
        
        try:
            response = self.session.get(f"{BACKEND_URL}/auth/profile")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["id", "name", "email", "role"]
                
                if all(field in data for field in required_fields):
                    self.log_result("Auth Profile", True, "Profile endpoint working correctly", 
                                  f"Profile: {data}")
                    return True
                else:
                    missing_fields = [field for field in required_fields if field not in data]
                    self.log_result("Auth Profile", False, f"Profile missing required fields: {missing_fields}", 
                                  f"Response: {data}")
                    return False
            else:
                self.log_result("Auth Profile", False, f"Profile failed with status {response.status_code}", 
                              response.text)
                return False
                
        except Exception as e:
            self.log_result("Auth Profile", False, f"Profile request failed: {str(e)}")
            return False
    
    def test_dashboard_stats(self):
        """Test dashboard stats endpoint"""
        print("\n=== Testing Dashboard Stats ===")
        
        try:
            response = self.session.get(f"{BACKEND_URL}/dashboard/stats")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["total_books", "books_issued", "books_returned", "pending_requests"]
                
                if all(field in data for field in required_fields):
                    # Verify all values are integers
                    if all(isinstance(data[field], int) for field in required_fields):
                        self.log_result("Dashboard Stats", True, "Stats endpoint working correctly", 
                                      f"Stats: {data}")
                        return True
                    else:
                        self.log_result("Dashboard Stats", False, "Stats contain non-integer values", 
                                      f"Response: {data}")
                        return False
                else:
                    missing_fields = [field for field in required_fields if field not in data]
                    self.log_result("Dashboard Stats", False, f"Stats missing required fields: {missing_fields}", 
                                  f"Response: {data}")
                    return False
            else:
                self.log_result("Dashboard Stats", False, f"Stats failed with status {response.status_code}", 
                              response.text)
                return False
                
        except Exception as e:
            self.log_result("Dashboard Stats", False, f"Stats request failed: {str(e)}")
            return False
    
    def test_categories(self):
        """Test categories endpoint"""
        print("\n=== Testing Categories ===")
        
        try:
            response = self.session.get(f"{BACKEND_URL}/categories")
            
            if response.status_code == 200:
                data = response.json()
                
                if isinstance(data, list) and len(data) > 0:
                    expected_categories = ["Science Fiction", "Mystery", "Romance", "Technology", 
                                         "History", "Biography", "Self Help", "Fiction", 
                                         "Non-Fiction", "Educational"]
                    
                    if all(cat in data for cat in expected_categories):
                        self.log_result("Categories", True, "Categories endpoint working correctly", 
                                      f"Categories count: {len(data)}")
                        return True
                    else:
                        self.log_result("Categories", False, "Categories missing expected values", 
                                      f"Response: {data}")
                        return False
                else:
                    self.log_result("Categories", False, "Categories response is not a valid list", 
                                  f"Response: {data}")
                    return False
            else:
                self.log_result("Categories", False, f"Categories failed with status {response.status_code}", 
                              response.text)
                return False
                
        except Exception as e:
            self.log_result("Categories", False, f"Categories request failed: {str(e)}")
            return False
    
    def create_sample_base64_content(self):
        """Create sample base64 content for testing"""
        # Sample PDF content (minimal PDF structure)
        pdf_content = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000079 00000 n \n0000000173 00000 n \ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n253\n%%EOF"
        
        # Sample image content (1x1 pixel PNG)
        image_content = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\tpHYs\x00\x00\x0b\x13\x00\x00\x0b\x13\x01\x00\x9a\x9c\x18\x00\x00\x00\x0bIDATx\x9cc```\x00\x00\x00\x04\x00\x01\xdd\x8d\xb4\x1c\x00\x00\x00\x00IEND\xaeB`\x82'
        
        return base64.b64encode(pdf_content).decode(), base64.b64encode(image_content).decode()
    
    def test_book_create(self):
        """Test book creation endpoint"""
        print("\n=== Testing Book Creation ===")
        
        pdf_content, image_content = self.create_sample_base64_content()
        
        book_data = {
            "title": "Advanced Python Programming",
            "author": "John Smith",
            "category": "Technology",
            "pdf_content": pdf_content,
            "cover_image": image_content
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/books", json=book_data)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["id", "title", "author", "category", "upload_date", "uploaded_by", "status"]
                
                if all(field in data for field in required_fields):
                    self.created_book_ids.append(data["id"])
                    self.log_result("Book Create", True, "Book created successfully", 
                                  f"Book ID: {data['id']}, Title: {data['title']}")
                    return data["id"]
                else:
                    missing_fields = [field for field in required_fields if field not in data]
                    self.log_result("Book Create", False, f"Book creation missing required fields: {missing_fields}", 
                                  f"Response: {data}")
                    return None
            else:
                self.log_result("Book Create", False, f"Book creation failed with status {response.status_code}", 
                              response.text)
                return None
                
        except Exception as e:
            self.log_result("Book Create", False, f"Book creation request failed: {str(e)}")
            return None
    
    def test_book_list(self):
        """Test book listing endpoint"""
        print("\n=== Testing Book Listing ===")
        
        try:
            # Test basic listing
            response = self.session.get(f"{BACKEND_URL}/books")
            
            if response.status_code == 200:
                data = response.json()
                
                if isinstance(data, list):
                    self.log_result("Book List", True, f"Book listing working correctly", 
                                  f"Books count: {len(data)}")
                    
                    # Test with category filter
                    response_filtered = self.session.get(f"{BACKEND_URL}/books?category=Technology")
                    if response_filtered.status_code == 200:
                        filtered_data = response_filtered.json()
                        self.log_result("Book List Filter", True, "Category filtering working", 
                                      f"Filtered books count: {len(filtered_data)}")
                    
                    # Test with search
                    response_search = self.session.get(f"{BACKEND_URL}/books?search=Python")
                    if response_search.status_code == 200:
                        search_data = response_search.json()
                        self.log_result("Book Search", True, "Search functionality working", 
                                      f"Search results count: {len(search_data)}")
                    
                    return True
                else:
                    self.log_result("Book List", False, "Book listing response is not a valid list", 
                                  f"Response: {data}")
                    return False
            else:
                self.log_result("Book List", False, f"Book listing failed with status {response.status_code}", 
                              response.text)
                return False
                
        except Exception as e:
            self.log_result("Book List", False, f"Book listing request failed: {str(e)}")
            return False
    
    def test_book_get(self, book_id):
        """Test getting specific book"""
        print(f"\n=== Testing Get Book {book_id} ===")
        
        try:
            response = self.session.get(f"{BACKEND_URL}/books/{book_id}")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["id", "title", "author", "category"]
                
                if all(field in data for field in required_fields):
                    self.log_result("Book Get", True, "Book retrieval working correctly", 
                                  f"Book: {data['title']} by {data['author']}")
                    return True
                else:
                    missing_fields = [field for field in required_fields if field not in data]
                    self.log_result("Book Get", False, f"Book get missing required fields: {missing_fields}", 
                                  f"Response: {data}")
                    return False
            elif response.status_code == 404:
                self.log_result("Book Get", False, "Book not found", "404 error")
                return False
            else:
                self.log_result("Book Get", False, f"Book get failed with status {response.status_code}", 
                              response.text)
                return False
                
        except Exception as e:
            self.log_result("Book Get", False, f"Book get request failed: {str(e)}")
            return False
    
    def test_book_update(self, book_id):
        """Test book update endpoint"""
        print(f"\n=== Testing Book Update {book_id} ===")
        
        update_data = {
            "title": "Advanced Python Programming - Updated",
            "author": "John Smith Jr.",
            "category": "Technology"
        }
        
        try:
            response = self.session.put(f"{BACKEND_URL}/books/{book_id}", json=update_data)
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get("title") == update_data["title"] and data.get("author") == update_data["author"]:
                    self.log_result("Book Update", True, "Book updated successfully", 
                                  f"Updated title: {data['title']}")
                    return True
                else:
                    self.log_result("Book Update", False, "Book update did not persist changes", 
                                  f"Response: {data}")
                    return False
            elif response.status_code == 404:
                self.log_result("Book Update", False, "Book not found for update", "404 error")
                return False
            else:
                self.log_result("Book Update", False, f"Book update failed with status {response.status_code}", 
                              response.text)
                return False
                
        except Exception as e:
            self.log_result("Book Update", False, f"Book update request failed: {str(e)}")
            return False
    
    def test_book_delete(self, book_id):
        """Test book deletion endpoint"""
        print(f"\n=== Testing Book Delete {book_id} ===")
        
        try:
            response = self.session.delete(f"{BACKEND_URL}/books/{book_id}")
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get("success") and "deleted successfully" in data.get("message", ""):
                    self.log_result("Book Delete", True, "Book deleted successfully", 
                                  f"Message: {data['message']}")
                    return True
                else:
                    self.log_result("Book Delete", False, "Book delete response invalid", 
                                  f"Response: {data}")
                    return False
            elif response.status_code == 404:
                self.log_result("Book Delete", False, "Book not found for deletion", "404 error")
                return False
            else:
                self.log_result("Book Delete", False, f"Book delete failed with status {response.status_code}", 
                              response.text)
                return False
                
        except Exception as e:
            self.log_result("Book Delete", False, f"Book delete request failed: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting AutoLib Admin Backend API Tests")
        print(f"Backend URL: {BACKEND_URL}")
        print("=" * 60)
        
        # Test authentication
        auth_login_success = self.test_auth_login()
        auth_profile_success = self.test_auth_profile()
        
        # Test dashboard
        dashboard_success = self.test_dashboard_stats()
        
        # Test categories
        categories_success = self.test_categories()
        
        # Test book CRUD operations
        book_id = self.test_book_create()
        book_list_success = self.test_book_list()
        
        book_get_success = False
        book_update_success = False
        book_delete_success = False
        
        if book_id:
            book_get_success = self.test_book_get(book_id)
            book_update_success = self.test_book_update(book_id)
            book_delete_success = self.test_book_delete(book_id)
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests} ✅")
        print(f"Failed: {failed_tests} ❌")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        print("\n📋 DETAILED RESULTS:")
        for result in self.test_results:
            status = "✅" if result["success"] else "❌"
            print(f"{status} {result['test']}: {result['message']}")
        
        # Return overall success
        critical_tests = [
            auth_login_success, auth_profile_success, dashboard_success, 
            categories_success, book_list_success
        ]
        
        return all(critical_tests) and (not book_id or all([book_get_success, book_update_success, book_delete_success]))

if __name__ == "__main__":
    tester = AutoLibBackendTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 All critical backend tests passed!")
        exit(0)
    else:
        print("\n⚠️  Some backend tests failed!")
        exit(1)