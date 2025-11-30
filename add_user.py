from db_auth import register_user

username = input("Enter username: ")
password = input("Enter password: ")

try:
    user = register_user(username, password)
    print(f"✓ User '{username}' created successfully!")
    print(f"User ID: {user['id']}")
except Exception as e:
    print(f"✗ Error: {e}")
