#!/usr/bin/env bash
# Onboards a new hotel through the public API: creates the owner account and
# loads starter setup from the V3.0 spec (room types, EP/CP/MAP/AP meal plans,
# rooms 101-109, venues, a short menu). The rates are the spec's sample rates;
# change them in Hotel setup before taking real bookings. No bookings,
# payments or other transactions are created.
#
# Usage (credentials are never stored in this file):
#   HOTEL_NAME="Hotel Thar Heritage Resort" OWNER_EMAIL=owner@example.com \
#   OWNER_PASSWORD='a-strong-password' API=https://your-domain/api/v1 \
#   bash shared/scripts/seed-hotel-demo.sh
set -euo pipefail
API=${API:-http://localhost:4001/api/v1}
JAR=$(mktemp)
EMAIL=${OWNER_EMAIL:?set OWNER_EMAIL}
PASS=${OWNER_PASSWORD:?set OWNER_PASSWORD}
HOTEL=${HOTEL_NAME:-Hotel Thar Heritage Resort}
BRANCH=${BRANCH_NAME:-Main}

curl -sf -c "$JAR" -H 'Content-Type: application/json' -X POST "$API/auth/register" \
  -d "{\"restaurantName\":\"$HOTEL\",\"branchName\":\"$BRANCH\",\"ownerName\":\"Resort Owner\",\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" >/dev/null \
  || curl -sf -c "$JAR" -H 'Content-Type: application/json' -X POST "$API/auth/login" -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" >/dev/null

B=$(curl -sf -b "$JAR" "$API/branches" | python3 -c 'import sys,json; print(json.load(sys.stdin)[0]["id"])')
post() { curl -sf -b "$JAR" -H 'Content-Type: application/json' -X "${3:-POST}" "$API/hotel/$1?branchId=$B" -d "$2"; echo; }

post settings '{"tagline":"Royal stays in the Golden City","brandColor":"#8A3A1F","accentColor":"#D4A24C","checkInTime":"12:00","checkOutTime":"11:00","checkoutSoonHours":3,"geofenceRadiusM":200}' PATCH
for c in 'Single Bed Room|SGL|SINGLE|2200|1' 'Double Bed Room|DBL|DOUBLE|3200|2' 'Twin Bed Room|TWN|TWIN|3400|2' 'Deluxe Room|DLX|KING|4500|2' 'Luxury Suite|STE|SUITE|6500|3'; do
  IFS='|' read -r name code bed rate adults <<<"$c"
  post categories "{\"name\":\"$name\",\"code\":\"$code\",\"bedType\":\"$bed\",\"baseRate\":$rate,\"extraGuestRate\":800,\"maxAdults\":$adults,\"maxChildren\":1,\"taxRatePercent\":12,\"amenities\":[\"AC\",\"Wi-Fi\",\"TV\"]}" || true
done
for m in 'EP|Room Only|0|false|false|false' 'CP|Room + Breakfast|350|true|false|false' 'MAP|Breakfast + One Main Meal|950|true|false|true' 'AP|Breakfast + Lunch + Dinner|1450|true|true|true'; do
  IFS='|' read -r code name price bf lu di <<<"$m"
  post meal-plans "{\"code\":\"$code\",\"name\":\"$name\",\"pricePerNight\":$price,\"includesBreakfast\":$bf,\"includesLunch\":$lu,\"includesDinner\":$di}" || true
done
CATS=$(curl -sf -b "$JAR" "$API/hotel/categories?branchId=$B")
cat_id() { echo "$CATS" | python3 -c "import sys,json; print([c['id'] for c in json.load(sys.stdin) if c['code']=='$1'][0])"; }
post rooms/bulk "{\"categoryId\":\"$(cat_id SGL)\",\"floorLabel\":\"Ground\",\"numbers\":[\"101\",\"102\"]}" || true
post rooms/bulk "{\"categoryId\":\"$(cat_id DBL)\",\"floorLabel\":\"Ground\",\"numbers\":[\"103\",\"104\",\"105\"]}" || true
post rooms/bulk "{\"categoryId\":\"$(cat_id TWN)\",\"floorLabel\":\"First\",\"numbers\":[\"106\",\"107\"]}" || true
post rooms/bulk "{\"categoryId\":\"$(cat_id DLX)\",\"floorLabel\":\"First\",\"numbers\":[\"108\"]}" || true
post rooms/bulk "{\"categoryId\":\"$(cat_id STE)\",\"floorLabel\":\"Second\",\"numbers\":[\"109\"]}" || true
if [ "$(curl -sf -b "$JAR" "$API/hotel/venues?branchId=$B" | python3 -c 'import sys,json; print(len(json.load(sys.stdin)))')" = "0" ]; then
post venues '{"name":"Marriage Garden","kind":"MARRIAGE_GARDEN","capacity":800,"baseRate":75000,"perPlateRate":650}' || true
post venues '{"name":"Darbar Banquet Hall","kind":"BANQUET","capacity":300,"baseRate":35000,"perPlateRate":550}' || true
post venues '{"name":"Meeting Hall","kind":"MEETING_HALL","capacity":40,"baseRate":8000,"perPlateRate":350}' || true
fi
# Restaurant & room-service menu from the spec's demo list (prices are samples).
mpost() { curl -sf -b "$JAR" -H 'Content-Type: application/json' -X POST "$API/menu/$1?branchId=$B" -d "$2"; }
if [ "$(curl -sf -b "$JAR" "$API/menu/categories?branchId=$B" | python3 -c 'import sys,json; print(len(json.load(sys.stdin)))')" = "0" ]; then
  MAINS=$(mpost categories '{"name":"Main Course","sortOrder":1}' | python3 -c 'import sys,json; print(json.load(sys.stdin)["id"])')
  BEV=$(mpost categories '{"name":"Beverages","sortOrder":2}' | python3 -c 'import sys,json; print(json.load(sys.stdin)["id"])')
  for it in "$MAINS|Paneer Butter Masala|280|Cottage cheese in a rich tomato-butter gravy" "$MAINS|Dal Tadka|180|Yellow lentils tempered with ghee and cumin" "$MAINS|Veg Biryani|220|Fragrant basmati layered with garden vegetables" "$BEV|Fresh Mango Shake|160|Alphonso mango blended with chilled milk" "$BEV|Hot Coffee|90|Freshly brewed filter coffee" "$BEV|Masala Chai|50|Desert-style spiced tea"; do
    IFS='|' read -r cat name price desc <<<"$it"
    mpost items "{\"categoryId\":\"$cat\",\"name\":\"$name\",\"price\":$price,\"description\":\"$desc\",\"taxRatePercent\":5}" >/dev/null
  done
fi
echo "Done. Branch $B"
