import requests
import sys
import json
from datetime import datetime

class ClearMarketAPITester:
    def __init__(self, base_url="https://clearmarket.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.session = requests.Session()

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = self.session.get(url, headers=test_headers)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, dict) and len(str(response_data)) < 500:
                        print(f"   Response: {response_data}")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test basic health endpoint"""
        return self.run_test("Health Check", "GET", "health", 200)

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test("Root Endpoint", "GET", "", 200)

    def test_signup(self):
        """Test user signup"""
        timestamp = datetime.now().strftime('%H%M%S')
        signup_data = {
            "email": f"test.user.{timestamp}@example.com",
            "password": "TestPass123!",
            "name": f"Test User {timestamp}"
        }
        success, response = self.run_test("User Signup", "POST", "auth/signup", 200, signup_data)
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response['user']['user_id']
            print(f"   Token obtained: {self.token[:20]}...")
            return True
        return False

    def test_login(self):
        """Test user login with existing credentials"""
        # First create a user, then login
        timestamp = datetime.now().strftime('%H%M%S')
        email = f"login.test.{timestamp}@example.com"
        password = "TestPass123!"
        
        # Create user
        signup_data = {
            "email": email,
            "password": password,
            "name": f"Login Test User {timestamp}"
        }
        self.run_test("Create User for Login Test", "POST", "auth/signup", 200, signup_data)
        
        # Now test login
        login_data = {
            "email": email,
            "password": password
        }
        success, response = self.run_test("User Login", "POST", "auth/login", 200, login_data)
        if success and 'token' in response:
            # Keep the original token for other tests
            print(f"   Login successful with token: {response['token'][:20]}...")
            return True
        return False

    def test_get_me(self):
        """Test get current user endpoint"""
        if not self.token:
            print("❌ No token available for /auth/me test")
            return False
        return self.run_test("Get Current User", "GET", "auth/me", 200)[0]

    def test_stock_search(self):
        """Test stock search endpoint"""
        return self.run_test("Stock Search", "GET", "stocks/search?q=RELIANCE", 200)[0]

    def test_stock_analysis(self):
        """Test stock analysis endpoint (requires auth)"""
        if not self.token:
            print("❌ No token available for stock analysis test")
            return False
        return self.run_test("Stock Analysis", "GET", "stocks/analyze/RELIANCE", 200)[0]

    def test_recent_analyses(self):
        """Test recent analyses endpoint"""
        if not self.token:
            print("❌ No token available for recent analyses test")
            return False
        return self.run_test("Recent Analyses", "GET", "stocks/recent", 200)[0]

    def test_portfolio_get(self):
        """Test get portfolio endpoint"""
        if not self.token:
            print("❌ No token available for portfolio test")
            return False
        return self.run_test("Get Portfolio", "GET", "portfolio", 200)[0]

    def test_portfolio_add(self):
        """Test add stock to portfolio"""
        if not self.token:
            print("❌ No token available for portfolio add test")
            return False
        
        portfolio_data = {
            "symbol": "TCS",
            "quantity": 10,
            "buy_price": 4000.0
        }
        success, response = self.run_test("Add to Portfolio", "POST", "portfolio/add", 200, portfolio_data)
        if success and 'id' in response:
            self.portfolio_stock_id = response['id']
            return True
        return False

    def test_portfolio_remove(self):
        """Test remove stock from portfolio"""
        if not self.token or not hasattr(self, 'portfolio_stock_id'):
            print("❌ No portfolio stock ID available for removal test")
            return False
        
        return self.run_test("Remove from Portfolio", "DELETE", f"portfolio/{self.portfolio_stock_id}", 200)[0]

    def test_plans(self):
        """Test get subscription plans"""
        return self.run_test("Get Plans", "GET", "plans", 200)[0]

    def test_mutual_funds(self):
        """Test get mutual funds"""
        return self.run_test("Get Mutual Funds", "GET", "mutualfunds", 200)[0]

    def test_mutual_fund_detail(self):
        """Test get mutual fund detail"""
        if not self.token:
            print("❌ No token available for mutual fund detail test")
            return False
        return self.run_test("Get Mutual Fund Detail", "GET", "mutualfunds/mf1", 200)[0]

    def test_invalid_endpoints(self):
        """Test some invalid endpoints to ensure proper error handling"""
        print("\n🔍 Testing Error Handling...")
        
        # Test invalid stock analysis
        if self.token:
            self.run_test("Invalid Stock Analysis", "GET", "stocks/analyze/INVALID123", 200)  # Should still work with mock data
        
        # Test unauthorized access
        old_token = self.token
        self.token = "invalid_token"
        self.run_test("Unauthorized Access", "GET", "auth/me", 401)
        self.token = old_token
        
        # Test non-existent endpoint
        self.run_test("Non-existent Endpoint", "GET", "nonexistent", 404)

def main():
    print("🚀 Starting ClearMarket API Tests...")
    print("=" * 60)
    
    tester = ClearMarketAPITester()
    
    # Basic connectivity tests
    tester.test_health_check()
    tester.test_root_endpoint()
    
    # Authentication tests
    tester.test_signup()
    tester.test_login()
    tester.test_get_me()
    
    # Stock-related tests
    tester.test_stock_search()
    tester.test_stock_analysis()
    tester.test_recent_analyses()
    
    # Portfolio tests
    tester.test_portfolio_get()
    tester.test_portfolio_add()
    tester.test_portfolio_remove()
    
    # Other feature tests
    tester.test_plans()
    tester.test_mutual_funds()
    tester.test_mutual_fund_detail()
    
    # Error handling tests
    tester.test_invalid_endpoints()
    
    # Print results
    print("\n" + "=" * 60)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())