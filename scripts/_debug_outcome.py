import scripts.ifa_deep_scraper as s

client = s.IfaClient(delay=0.5, verify_ssl=False)
label = client.fetch_season_label(25)
matches = s.list_league_matches(client, 25, label)
print("matches", len(matches))
m = matches[0]
print("game", m.game_id, m.outcome)
soup = client.fetch_game_page(m.game_id, 25)
print("soup", soup is not None)
if soup:
    side = s.detect_oranit_side_from_game(soup)
    print("side", side)
    result = s.parse_game_match_result(soup)
    print("result", result)
    if side:
        parts = s.extract_oranit_participants_from_game(soup, side)
        print("participants", len(parts), parts[:3])
