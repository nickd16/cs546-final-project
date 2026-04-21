(function () {
  const mapElement = document.getElementById('locations-map');
  if (!mapElement || typeof L === 'undefined') return;

  const pageMeta = window.locationPageMeta || {};
  const nearbyListElement = document.getElementById('location-nearby-list');
  const nearbySummaryElement = document.getElementById('location-nearby-summary');
  const detailPanelElement = document.getElementById('location-detail-panel');
  const mapMessageElement = document.getElementById('location-map-message');
  const typeFilterElement = document.getElementById('location-type-filter');
  const searchElement = document.getElementById('location-search-text');
  const radiusElement = document.getElementById('location-radius-filter');
  const autoGeolocateElement = document.getElementById('location-auto-geolocate');
  const useMyLocationButton = document.getElementById('location-use-my-location');

  const defaultCenter = [40.7128, -74.0060];
  const storageKey = 'cs546-location-page-state';
  const state = {
    selectedLocationId: typeof pageMeta.selectedLocationId === 'string' ? pageMeta.selectedLocationId : '',
    selectedLocationDetails: null,
    currentPoint: null,
    nearbyLocations: [],
    referenceLabel: 'Default city center',
    currentMarkers: [],
    currentPointMarker: null,
    currentPointCircle: null,
    map: null
  };

  const map = L.map('locations-map').setView(defaultCenter, 12);
  state.map = map;

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);

  restorePageState();
  bindEvents();
  updateNearbyLocations();
  if (autoGeolocateElement && autoGeolocateElement.checked) requestBrowserLocation();

  function bindEvents() {
    if (useMyLocationButton) {
      useMyLocationButton.addEventListener('click', function () {
        requestBrowserLocation();
      });
    }

    if (radiusElement) {
      radiusElement.addEventListener('change', function () {
        savePageState();
        updateNearbyLocations();
      });
    }

    if (typeFilterElement) {
      typeFilterElement.addEventListener('change', function () {
        savePageState();
        updateNearbyLocations();
      });
    }

    if (searchElement) {
      searchElement.addEventListener('input', function () {
        savePageState();
        updateNearbyLocations();
      });
    }

    if (autoGeolocateElement) {
      autoGeolocateElement.addEventListener('change', function () {
        savePageState();
      });
    }

    map.on('click', function (event) {
      setCurrentPoint(event.latlng.lat, event.latlng.lng, 'Map selection');
    });
  }

  function restorePageState() {
    if (!radiusElement || !typeFilterElement || !searchElement || !autoGeolocateElement) return;

    let savedState = null;
    try {
      savedState = JSON.parse(localStorage.getItem(storageKey) || 'null');
    } catch (e) {
      savedState = null;
    }

    if (!savedState || typeof savedState !== 'object') return;

    if (typeof savedState.radiusMiles === 'string') radiusElement.value = savedState.radiusMiles;
    if (typeof savedState.typeFilter === 'string') typeFilterElement.value = savedState.typeFilter;
    if (typeof savedState.searchText === 'string') searchElement.value = savedState.searchText;
    if (savedState.autoGeolocate === false) autoGeolocateElement.checked = false;
    if (savedState.currentPoint && typeof savedState.currentPoint.latitude === 'number' && typeof savedState.currentPoint.longitude === 'number') {
      state.currentPoint = {
        latitude: savedState.currentPoint.latitude,
        longitude: savedState.currentPoint.longitude
      };
      state.referenceLabel = savedState.referenceLabel || 'Saved point';
    }
    if (!state.selectedLocationId && typeof savedState.selectedLocationId === 'string') state.selectedLocationId = savedState.selectedLocationId;
  }

  function savePageState() {
    if (!radiusElement || !typeFilterElement || !searchElement || !autoGeolocateElement) return;
    const payload = {
      radiusMiles: radiusElement.value,
      typeFilter: typeFilterElement.value,
      searchText: searchElement.value,
      autoGeolocate: autoGeolocateElement.checked,
      selectedLocationId: state.selectedLocationId,
      referenceLabel: state.referenceLabel,
      currentPoint: state.currentPoint
    };
    localStorage.setItem(storageKey, JSON.stringify(payload));
  }

  function requestBrowserLocation() {
    if (!navigator.geolocation) {
      setMapMessage('This browser does not support location detection. Click the map to set a point.');
      return;
    }

    setMapMessage('Trying to get your current location.');
    navigator.geolocation.getCurrentPosition(
      function (position) {
        setCurrentPoint(position.coords.latitude, position.coords.longitude, 'Your current location');
      },
      function () {
        setMapMessage('Location access was not granted. Click the map to set your current location manually.');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000
      }
    );
  }

  function setCurrentPoint(latitude, longitude, label) {
    state.currentPoint = {latitude: latitude, longitude: longitude};
    state.referenceLabel = label;
    savePageState();
    updateNearbyLocations();
  }

  function getReferencePoint() {
    if (state.currentPoint) return [state.currentPoint.latitude, state.currentPoint.longitude];
    return defaultCenter;
  }

  function getRadiusMiles() {
    if (!radiusElement) return 5;
    const value = Number(radiusElement.value);
    if (Number.isNaN(value) || value <= 0) return 5;
    return value;
  }

  function updateNearbyLocations() {
    const referencePoint = getReferencePoint();
    const radiusMiles = getRadiusMiles();
    const typeFilter = typeFilterElement ? String(typeFilterElement.value || 'all') : 'all';
    const searchText = searchElement ? String(searchElement.value || '').trim().toLowerCase() : '';
    setMapMessage('Loading nearby locations.');

    fetch('/location/search/nearby?latitude=' + encodeURIComponent(referencePoint[0]) +
      '&longitude=' + encodeURIComponent(referencePoint[1]) +
      '&radiusMiles=' + encodeURIComponent(radiusMiles) +
      '&locationTypeFilter=' + encodeURIComponent(typeFilter) +
      '&q=' + encodeURIComponent(searchText))
      .then(function (response) {
        return response.json().then(function (data) {
          if (!response.ok) throw new Error(data && data.error ? data.error : 'Could not load nearby locations');
          return data;
        });
      })
      .then(function (locations) {
        state.nearbyLocations = Array.isArray(locations) ? locations : [];
        renderMap(referencePoint, radiusMiles);
        renderNearbyList();

        if (state.selectedLocationId) {
          let foundSelected = false;
          for (let i = 0; i < state.nearbyLocations.length; i++) {
            if (state.nearbyLocations[i]._idStr === state.selectedLocationId) foundSelected = true;
          }
          if (!foundSelected) state.selectedLocationId = '';
        }

        if (!state.selectedLocationId && state.nearbyLocations.length) state.selectedLocationId = state.nearbyLocations[0]._idStr;
        if (state.selectedLocationId) loadLocationDetails(state.selectedLocationId);
        else renderEmptyDetail();
        savePageState();
      })
      .catch(function (error) {
        state.nearbyLocations = [];
        renderMap(referencePoint, radiusMiles);
        renderNearbyList();
        renderEmptyDetail();
        setMapMessage(error.message || 'Could not load nearby locations.');
      });
  }

  function renderMap(referencePoint, radiusMiles) {
    clearMarkers();

    if (state.currentPointMarker) {
      map.removeLayer(state.currentPointMarker);
      state.currentPointMarker = null;
    }
    if (state.currentPointCircle) {
      map.removeLayer(state.currentPointCircle);
      state.currentPointCircle = null;
    }

    state.currentPointMarker = L.marker(referencePoint).addTo(map).bindPopup(escapeHtml(state.referenceLabel));
    state.currentPointCircle = L.circle(referencePoint, {
      radius: radiusMiles * 1609.34
    }).addTo(map);

    const bounds = [referencePoint];

    for (let i = 0; i < state.nearbyLocations.length; i++) {
      const location = state.nearbyLocations[i];
      const latLng = [location.latitude, location.longitude];
      bounds.push(latLng);
      const marker = L.marker(latLng).addTo(map);
      marker.bindPopup(buildPopupHtml(location));
      marker.on('click', function () {
        selectLocation(location._idStr);
      });
      state.currentMarkers.push(marker);
    }

    if (bounds.length === 1) map.setView(referencePoint, 13);
    else map.fitBounds(bounds, {padding: [30, 30]});

    if (!state.nearbyLocations.length) setMapMessage('No locations are inside the current radius. Change the radius, search, or choose another point on the map.');
    else setMapMessage('Showing up to 75 nearby locations around ' + state.referenceLabel + '. Click the map to move your current point.');
  }

  function clearMarkers() {
    for (let i = 0; i < state.currentMarkers.length; i++) {
      map.removeLayer(state.currentMarkers[i]);
    }
    state.currentMarkers = [];
  }

  function renderNearbyList() {
    if (!nearbySummaryElement || !nearbyListElement) return;

    if (!state.nearbyLocations.length) {
      nearbySummaryElement.textContent = '0 locations nearby';
      nearbyListElement.innerHTML = '<p>No locations matched your current point and filters.</p>';
      return;
    }

    nearbySummaryElement.textContent = state.nearbyLocations.length + ' nearby location' + (state.nearbyLocations.length === 1 ? '' : 's');
    let html = '<ul>';
    for (let i = 0; i < state.nearbyLocations.length; i++) {
      const location = state.nearbyLocations[i];
      html += '<li>';
      html += '<button type="button" class="location-select-button" data-location-id="' + escapeAttribute(location._idStr) + '">' + escapeHtml(location.locationName || 'Unknown location') + '</button>';
      html += ' ';
      html += '<span>' + escapeHtml(location.locationType || '') + '</span>';
      html += ' ';
      html += '<span>' + escapeHtml(location.distanceMiles.toFixed(2)) + ' miles</span>';
      if (location.averageRatingRounded !== null && location.averageRatingRounded !== undefined) html += ' <span>Rating ' + escapeHtml(String(location.averageRatingRounded)) + '/5</span>';
      if (location.isFavorite) html += ' <span>Favorite</span>';
      html += '</li>';
    }
    html += '</ul>';
    nearbyListElement.innerHTML = html;

    const buttons = nearbyListElement.getElementsByClassName('location-select-button');
    for (let i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', function () {
        selectLocation(this.getAttribute('data-location-id'));
      });
    }
  }

  function selectLocation(locationId) {
    state.selectedLocationId = locationId;
    savePageState();
    loadLocationDetails(locationId);
  }

  function loadLocationDetails(locationId) {
    if (!locationId || !detailPanelElement) return;
    detailPanelElement.innerHTML = '<p>Loading location details.</p>';

    fetch('/location/' + encodeURIComponent(locationId))
      .then(function (response) {
        return response.json().then(function (data) {
          if (!response.ok) throw new Error(data && data.error ? data.error : 'Could not load location');
          return data;
        });
      })
      .then(function (locationDetails) {
        state.selectedLocationDetails = locationDetails;
        renderLocationDetails(locationDetails);
        savePageState();
      })
      .catch(function (error) {
        detailPanelElement.innerHTML = '<p class="error">' + escapeHtml(error.message || 'Could not load location') + '</p>';
      });
  }

  function renderEmptyDetail() {
    if (!detailPanelElement) return;
    detailPanelElement.innerHTML = '<p>Select a location from the map or nearby list.</p>';
  }

  function renderLocationDetails(location) {
    if (!detailPanelElement) return;

    let html = '';
    html += '<article>';
    html += '<h3>' + escapeHtml(location.locationName || 'Unknown location') + '</h3>';
    html += '<p><strong>Type:</strong> ' + escapeHtml(location.locationType || '') + '</p>';
    html += '<p><strong>Address:</strong> ' + escapeHtml(location.address || 'Not available') + '</p>';
    html += '<p><strong>Description:</strong> ' + escapeHtml(location.description || 'No description yet') + '</p>';
    html += '<p><strong>Average Rating:</strong> ' + escapeHtml(location.averageRatingRounded === null || location.averageRatingRounded === undefined ? 'No ratings yet' : String(location.averageRatingRounded) + '/5') + '</p>';
    html += '<p><strong>Details:</strong> ' + escapeHtml(buildLocationMetaText(location)) + '</p>';
    html += '<p><a href="/forum?catagoryFilter=' + encodeURIComponent(location.locationType) + '">Open ' + escapeHtml(location.locationType || 'all') + ' forum</a></p>';
    html += '<p><a href="/request">Request a new nearby location</a></p>';

    html += '<form action="/location/' + escapeAttribute(location._idStr) + '/favorite" method="post">';
    html += '<button type="submit">' + (location.isFavorite ? 'Unfavorite location' : 'Favorite location') + '</button>';
    html += '</form>';

    html += '<section>';
    html += '<h4>Ratings and Reviews</h4>';
    html += '<form action="/location/' + escapeAttribute(location._idStr) + '/rating" method="post">';
    html += '<p><label for="rating-score">Score</label><br>';
    html += '<select id="rating-score" name="score" required>';
    html += '<option value="1">1</option>';
    html += '<option value="2">2</option>';
    html += '<option value="3">3</option>';
    html += '<option value="4">4</option>';
    html += '<option value="5">5</option>';
    html += '</select></p>';
    html += '<p><label for="rating-review">Review</label><br>';
    html += '<textarea id="rating-review" name="review" rows="3" required></textarea></p>';
    html += '<p><button type="submit">Save rating</button></p>';
    html += '</form>';
    html += buildRatingsHtml(location.ratings);
    html += '</section>';

    html += '<section>';
    html += '<h4>Time Slots</h4>';
    html += '<form action="/location/' + escapeAttribute(location._idStr) + '/timeslots/range" method="post">';
    html += '<p><label for="slot-start">Start</label><br><input id="slot-start" type="datetime-local" name="startDateTime" required></p>';
    html += '<p><label for="slot-end">End</label><br><input id="slot-end" type="datetime-local" name="endDateTime" required></p>';
    html += '<p><button type="submit">Create or join 15 minute range</button></p>';
    html += '</form>';
    html += buildTimeSlotsHtml(location);
    html += '</section>';

    html += '<section>';
    html += '<h4>Status Updates</h4>';
    html += '<form action="/location/' + escapeAttribute(location._idStr) + '/status" method="post">';
    html += '<p><label for="status-body">Status update</label><br><textarea id="status-body" name="body" rows="3" required></textarea></p>';
    html += '<p><button type="submit">Post status update</button></p>';
    html += '</form>';
    if (pageMeta.isAdmin) {
      html += '<form action="/location/' + escapeAttribute(location._idStr) + '/status/clear" method="post">';
      html += '<button type="submit">Clear all statuses</button>';
      html += '</form>';
    }
    html += buildStatusesHtml(location);
    html += '</section>';

    html += '<section>';
    html += '<h4>Coordination Comments</h4>';
    html += '<form action="/location/' + escapeAttribute(location._idStr) + '/comment" method="post">';
    html += '<p><label for="comment-body">Comment</label><br><textarea id="comment-body" name="body" rows="3" required></textarea></p>';
    html += '<p><button type="submit">Post comment</button></p>';
    html += '</form>';
    html += buildCommentsHtml(location);
    html += '</section>';

    if (pageMeta.isAdmin) {
      html += '<section>';
      html += '<h4>Admin Edit Location</h4>';
      html += '<form action="/location/' + escapeAttribute(location._idStr) + '/update" method="post">';
      html += '<p><label for="edit-location-type">Location type</label><br>';
      html += '<select id="edit-location-type" name="locationType" required>';
      html += buildTypeOptionsHtml(location.locationType);
      html += '</select></p>';
      html += '<p><label for="edit-location-name">Location name</label><br><input id="edit-location-name" name="locationName" type="text" value="' + escapeAttribute(location.locationName || '') + '" required></p>';
      html += '<p><label for="edit-location-description">Description</label><br><textarea id="edit-location-description" name="description" rows="3">' + escapeHtml(location.description || '') + '</textarea></p>';
      html += '<p><label for="edit-location-address">Address</label><br><input id="edit-location-address" name="address" type="text" value="' + escapeAttribute(location.address || '') + '"></p>';
      html += '<p><label for="edit-location-latitude">Latitude</label><br><input id="edit-location-latitude" name="latitude" type="number" step="any" value="' + escapeAttribute(location.latitude === null || location.latitude === undefined ? '' : String(location.latitude)) + '"></p>';
      html += '<p><label for="edit-location-longitude">Longitude</label><br><input id="edit-location-longitude" name="longitude" type="number" step="any" value="' + escapeAttribute(location.longitude === null || location.longitude === undefined ? '' : String(location.longitude)) + '"></p>';
      html += '<p><label for="edit-location-accessible">Accessible</label><br><select id="edit-location-accessible" name="accessible">' + buildBooleanOptionsHtml(location.accessible) + '</select></p>';
      html += '<p><label for="edit-location-numCourts">Number of courts</label><br><input id="edit-location-numCourts" name="numCourts" type="number" value="' + escapeAttribute(location.numCourts === null || location.numCourts === undefined ? '' : String(location.numCourts)) + '"></p>';
      html += '<p><label for="edit-location-indoorOutdoor">Indoor or outdoor</label><br><input id="edit-location-indoorOutdoor" name="indoorOutdoor" type="text" value="' + escapeAttribute(location.indoorOutdoor || '') + '"></p>';
      html += '<p><label for="edit-location-tennisType">Tennis type</label><br><input id="edit-location-tennisType" name="tennisType" type="text" value="' + escapeAttribute(location.tennisType || '') + '"></p>';
      html += '<p><label for="edit-location-length">Length</label><br><input id="edit-location-length" name="length" type="text" value="' + escapeAttribute(location.length || '') + '"></p>';
      html += '<p><label for="edit-location-difficulty">Difficulty</label><br><input id="edit-location-difficulty" name="difficulty" type="text" value="' + escapeAttribute(location.difficulty || '') + '"></p>';
      html += '<p><label for="edit-location-otherDetails">Other details</label><br><input id="edit-location-otherDetails" name="otherDetails" type="text" value="' + escapeAttribute(location.otherDetails || '') + '"></p>';
      html += '<p><label for="edit-location-limitedAccess">Limited access</label><br><input id="edit-location-limitedAccess" name="limitedAccess" type="text" value="' + escapeAttribute(location.limitedAccess || '') + '"></p>';
      html += '<p><button type="submit">Save location changes</button></p>';
      html += '</form>';
      html += '<form action="/location/' + escapeAttribute(location._idStr) + '/delete" method="post">';
      html += '<button type="submit">Delete location</button>';
      html += '</form>';
      html += '</section>';
    }

    html += '</article>';
    detailPanelElement.innerHTML = html;
  }

  function buildRatingsHtml(ratings) {
    if (!ratings || !ratings.length) return '<p>No ratings yet.</p>';
    let html = '<ul>';
    for (let i = 0; i < ratings.length; i++) {
      const rating = ratings[i];
      html += '<li>';
      html += '<p><strong>' + escapeHtml(rating.authorUsername || 'Unknown') + '</strong> rated ' + escapeHtml(String(rating.score || '')) + '/5</p>';
      html += '<p>' + escapeHtml(rating.review || '') + '</p>';
      html += '<p>' + escapeHtml(rating.dateTimeLabel || '') + '</p>';
      html += '</li>';
    }
    html += '</ul>';
    return html;
  }

  function buildTimeSlotsHtml(location) {
    if (!location.timeSlots || !location.timeSlots.length) return '<p>No time slots yet.</p>';
    let html = '<ul>';
    for (let i = 0; i < location.timeSlots.length; i++) {
      const slot = location.timeSlots[i];
      html += '<li>';
      html += '<p><strong>' + escapeHtml(slot.startLabel || '') + '</strong> to ' + escapeHtml(slot.endLabel || '') + '</p>';
      html += '<p>' + escapeHtml(String(slot.joinedCount || 0)) + ' joined</p>';
      html += '<form action="/location/' + escapeAttribute(location._idStr) + '/timeslot/' + escapeAttribute(slot._idStr) + '/toggle" method="post">';
      html += '<button type="submit">' + (slot.isJoined ? 'Leave slot' : 'Join slot') + '</button>';
      html += '</form>';
      html += '</li>';
    }
    html += '</ul>';
    return html;
  }

  function buildStatusesHtml(location) {
    if (!location.statuses || !location.statuses.length) return '<p>No status updates yet.</p>';
    let html = '<ul>';
    for (let i = 0; i < location.statuses.length; i++) {
      const status = location.statuses[i];
      html += '<li>';
      html += '<p><strong>' + escapeHtml(status.authorUsername || 'Unknown') + '</strong></p>';
      html += '<p>' + escapeHtml(status.body || '') + '</p>';
      html += '<p>' + escapeHtml(status.dateTimeLabel || '') + '</p>';
      html += '<form action="/location/' + escapeAttribute(location._idStr) + '/status/' + escapeAttribute(status._idStr) + '/vote" method="post">';
      html += '<input type="hidden" name="voteType" value="agree">';
      html += '<button type="submit">Agree (' + escapeHtml(String(status.agreeCount || 0)) + ')</button>';
      html += '</form>';
      html += '<form action="/location/' + escapeAttribute(location._idStr) + '/status/' + escapeAttribute(status._idStr) + '/vote" method="post">';
      html += '<input type="hidden" name="voteType" value="disagree">';
      html += '<button type="submit">Disagree (' + escapeHtml(String(status.disagreeCount || 0)) + ')</button>';
      html += '</form>';
      html += '</li>';
    }
    html += '</ul>';
    return html;
  }

  function buildCommentsHtml(location) {
    if (!location.comments || !location.comments.length) return '<p>No comments yet.</p>';
    let html = '<ul>';
    for (let i = 0; i < location.comments.length; i++) {
      const comment = location.comments[i];
      html += '<li>';
      html += '<p><strong>' + escapeHtml(comment.authorUsername || 'Unknown') + '</strong></p>';
      html += '<p>' + escapeHtml(comment.body || '') + '</p>';
      html += '<p>' + escapeHtml(comment.dateTimeLabel || '') + '</p>';
      if (pageMeta.isAdmin) {
        html += '<form action="/location/' + escapeAttribute(location._idStr) + '/comment/' + escapeAttribute(comment._idStr) + '/delete" method="post">';
        html += '<button type="submit">Delete comment</button>';
        html += '</form>';
      }
      html += '</li>';
    }
    html += '</ul>';
    return html;
  }

  function buildTypeOptionsHtml(selectedValue) {
    const types = ['tennis', 'basketball', 'handball', 'hiking'];
    let html = '';
    for (let i = 0; i < types.length; i++) {
      html += '<option value="' + escapeAttribute(types[i]) + '"' + (types[i] === selectedValue ? ' selected' : '') + '>' + escapeHtml(capitalize(types[i])) + '</option>';
    }
    return html;
  }

  function buildBooleanOptionsHtml(value) {
    let html = '';
    html += '<option value=""' + (value === null || value === undefined ? ' selected' : '') + '>Unknown</option>';
    html += '<option value="true"' + (value === true ? ' selected' : '') + '>Yes</option>';
    html += '<option value="false"' + (value === false ? ' selected' : '') + '>No</option>';
    return html;
  }

  function buildLocationMetaText(location) {
    const parts = [];
    if (location.accessible !== null && location.accessible !== undefined) parts.push('Accessible: ' + (location.accessible ? 'Yes' : 'No'));
    if (location.numCourts !== null && location.numCourts !== undefined) parts.push('Courts: ' + location.numCourts);
    if (location.indoorOutdoor) parts.push(location.indoorOutdoor);
    if (location.tennisType) parts.push('Tennis type: ' + location.tennisType);
    if (location.length) parts.push('Length: ' + location.length);
    if (location.difficulty) parts.push('Difficulty: ' + location.difficulty);
    if (location.otherDetails) parts.push('Other details: ' + location.otherDetails);
    if (location.limitedAccess) parts.push('Limited access: ' + location.limitedAccess);
    if (!parts.length) return 'No extra details yet';
    return parts.join(' | ');
  }

  function buildPopupHtml(location) {
    let html = '<strong>' + escapeHtml(location.locationName || 'Unknown location') + '</strong>';
    if (location.locationType) html += '<br>' + escapeHtml(capitalize(location.locationType));
    if (location.address) html += '<br>' + escapeHtml(location.address);
    if (location.distanceMiles !== undefined) html += '<br>' + escapeHtml(location.distanceMiles.toFixed(2)) + ' miles away';
    if (location.averageRatingRounded !== null && location.averageRatingRounded !== undefined) html += '<br>Rating ' + escapeHtml(String(location.averageRatingRounded)) + '/5';
    html += '<br>' + escapeHtml(String(location.commentCount || 0)) + ' comments';
    html += '<br>' + escapeHtml(String(location.statusUpdateCount || 0)) + ' statuses';
    html += '<br>' + escapeHtml(String(location.timeSlotCount || 0)) + ' time slots';
    return html;
  }

  function setMapMessage(message) {
    if (mapMessageElement) mapMessageElement.textContent = message;
  }

  function capitalize(value) {
    if (!value) return '';
    return String(value).charAt(0).toUpperCase() + String(value).slice(1);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttribute(value) {
    return escapeHtml(value);
  }
}());
