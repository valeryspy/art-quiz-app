from db_auth import register_user, login_user, get_user_data

# Test registration
print("Testing registration...")
user = register_user("testuser", "testpass123")
print(f"✓ User created: {user['username']}")

# Test login
print("\nTesting login...")
logged_in = login_user("testuser", "testpass123")
print(f"✓ Login successful: {logged_in['username']}")

# Test get user data
print("\nTesting get user data...")
data = get_user_data(logged_in['id'])
print(f"✓ User data: {data}")
