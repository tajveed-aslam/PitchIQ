from conftest import signup


def test_signup_login_and_me(client):
    headers = signup(client)
    me = client.get("/me", headers=headers).json()
    assert me["user"]["email"] == "player@example.com"
    assert me["allowance"]["plan"] == "trial" and me["allowance"]["limit"] == 3

    r = client.post("/auth/login", json={"email": "PLAYER@example.com", "password": "goodpass123"})
    assert r.status_code == 200 and r.json()["access_token"]


def test_duplicate_signup_and_wrong_password(client):
    signup(client)
    r = client.post("/auth/signup", json={"name": "X", "email": "player@example.com", "password": "goodpass123"})
    assert r.status_code == 409
    r = client.post("/auth/login", json={"email": "player@example.com", "password": "wrongpass1"})
    assert r.status_code == 401


def test_signup_validation(client):
    r = client.post("/auth/signup", json={"name": "X", "email": "not-an-email", "password": "goodpass123"})
    assert r.status_code == 422
    r = client.post("/auth/signup", json={"name": "X", "email": "a@b.co", "password": "short"})
    assert r.status_code == 422


def test_protected_routes_need_a_valid_token(client):
    assert client.get("/me").status_code == 401
    assert client.get("/me", headers={"Authorization": "Bearer nonsense"}).status_code == 401


def test_profile_update(client):
    headers = signup(client)
    r = client.patch("/me", headers=headers, json={"age": 15, "position": "Forward", "favourite_team": " Accra FC ",
                                                     "preferred_foot": "Left"})
    assert r.status_code == 200
    assert r.json()["favourite_team"] == "Accra FC" and r.json()["position"] == "Forward"
    assert client.patch("/me", headers=headers, json={"position": "Striker"}).status_code == 422
    assert client.patch("/me", headers=headers, json={"age": 3}).status_code == 422


def test_demo_login_needs_seed_and_is_read_only(client, seeded):
    r = client.post("/auth/demo")
    assert r.status_code == 200
    headers = {"Authorization": f"Bearer {r.json()['access_token']}"}
    assert client.get("/me", headers=headers).json()["user"]["is_guest"] is True
    assert client.patch("/me", headers=headers, json={"age": 20}).status_code == 403
    assert client.post("/me/plan", headers=headers, json={"plan": "skill"}).status_code == 403


def test_demo_unavailable_before_seed(client):
    assert client.post("/auth/demo").status_code == 503


def test_seeded_players_and_demo_cannot_log_in_with_a_password(client, seeded):
    for email in ("player1@seed.pitchiq.app", "demo@pitchiq.app"):
        r = client.post("/auth/login", json={"email": email, "password": "anything"})
        assert r.status_code == 401


def test_notifications_welcome_and_mark_read(client):
    headers = signup(client)
    notes = client.get("/me/notifications", headers=headers).json()
    assert len(notes) == 1 and "Welcome" in notes[0]["text"] and notes[0]["read"] is False
    client.post("/me/notifications/read", headers=headers)
    assert client.get("/me/notifications", headers=headers).json()[0]["read"] is True
