(function () {
  const mapElement = document.getElementById('locations-map');
  if (!mapElement || typeof L === 'undefined') return;

  const pageMeta = window.locationPageMeta || {};
  function canShowDeleteForOwnerContent(isMineFlag) {
    return isMineFlag === true || pageMeta.isAdmin === true;
  }
  const nearbyListElement = document.getElementById('location-nearby-list');
  const nearbySummaryElement = document.getElementById('location-nearby-summary');
  const favoriteListElement = document.getElementById('location-favorites-list');
  const favoriteSummaryElement = document.getElementById('location-favorites-summary');
  const detailPanelElement = document.getElementById('location-detail-panel');
  const mapMessageElement = document.getElementById('location-map-message');
  const typeFilterElement = document.getElementById('location-type-filter');
  const searchElement = document.getElementById('location-search-text');
  const radiusElement = document.getElementById('location-radius-filter');
  const autoGeolocateElement = document.getElementById('location-auto-geolocate');
  const useMyLocationButton = document.getElementById('location-use-my-location');
  const createLocationForm = document.getElementById('locationCreateForm');
  const createLocationFormError = document.getElementById('locationCreateFormError');

  const defaultCenter = [40.7128, -74.0060];
  const storageKey = 'cs546-location-page-state';
  const uiStateKey = 'cs546-location-page-ui-state';
  const state = {
    selectedLocationId: typeof pageMeta.selectedLocationId === 'string' ? pageMeta.selectedLocationId : '',
    selectedLocationDetails: null,
    currentPoint: null,
    nearbyLocations: [],
    referenceLabel: 'Default city center',
    currentMarkers: [],
    currentPointMarker: null,
    currentPointCircle: null,
    map: null,
    pendingUiRestore: null
  };

  const map = L.map('locations-map').setView(defaultCenter, 12);
  state.map = map;

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);

  restorePageState();
  bindEvents();
  fetchFavoriteLocations();
  updateNearbyLocations();
  if (autoGeolocateElement && autoGeolocateElement.checked) requestBrowserLocation();

  function parseOptionalNumberValue(value) {
    if (value === undefined || value === null) return null;
    const text = String(value).trim();
    if (!text) return null;
    const num = Number(text);
    if (Number.isNaN(num)) return null;
    return num;
  }

  function parseRequiredTextValue(value) {
    if (typeof value !== 'string') return '';
    return value.trim();
  }

  function validateLocationInputValues(values) {
    const locationType = parseRequiredTextValue(values.locationType || '').toLowerCase();
    if (!locationType) return 'Location type is required';
    if (locationType !== 'tennis' && locationType !== 'basketball' && locationType !== 'handball' && locationType !== 'hiking') {
      return 'Location type is invalid';
    }

    const locationName = parseRequiredTextValue(values.locationName || '');
    if (!locationName) return 'Location name is required';

    const latitudeText = parseRequiredTextValue(values.latitude || '');
    const longitudeText = parseRequiredTextValue(values.longitude || '');
    const latitude = parseOptionalNumberValue(latitudeText);
    const longitude = parseOptionalNumberValue(longitudeText);

    if (latitudeText && latitude === null) return 'Latitude must be a valid number';
    if (longitudeText && longitude === null) return 'Longitude must be a valid number';
    if (latitude !== null && (latitude < -90 || latitude > 90)) return 'Latitude must be between -90 and 90';
    if (longitude !== null && (longitude < -180 || longitude > 180)) return 'Longitude must be between -180 and 180';

    const numCourtsText = parseRequiredTextValue(values.numCourts || '');
    if (numCourtsText) {
      const numCourts = Number(numCourtsText);
      if (Number.isNaN(numCourts) || !Number.isInteger(numCourts) || numCourts < 0) return 'Number of courts must be a non-negative whole number';
    }

    return '';
  }

  function bindEvents() {
    document.addEventListener('submit', function (event) {
      const form = event.target;
      if (!form || !form.getAttribute) return;
      const action = String(form.getAttribute('action') || '');
      if (action.indexOf('/location/') !== 0) return;
      saveUiState();
    }, true);

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

    if (createLocationForm) {
      createLocationForm.addEventListener('submit', function (event) {
        if (createLocationFormError) createLocationFormError.textContent = '';
        const errorText = validateLocationInputValues({
          locationType: createLocationForm.elements.locationType ? createLocationForm.elements.locationType.value : '',
          locationName: createLocationForm.elements.locationName ? createLocationForm.elements.locationName.value : '',
          latitude: createLocationForm.elements.latitude ? createLocationForm.elements.latitude.value : '',
          longitude: createLocationForm.elements.longitude ? createLocationForm.elements.longitude.value : '',
          numCourts: createLocationForm.elements.numCourts ? createLocationForm.elements.numCourts.value : ''
        });
        if (errorText) {
          event.preventDefault();
          if (createLocationFormError) createLocationFormError.textContent = errorText;
        }
      });
    }
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

    try {
      const savedUiState = JSON.parse(localStorage.getItem(uiStateKey) || 'null');
      if (savedUiState && typeof savedUiState === 'object') state.pendingUiRestore = savedUiState;
    } catch (e) {
      state.pendingUiRestore = null;
    }
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

  function saveUiState() {
    const payload = {
      selectedLocationId: state.selectedLocationId,
      windowScrollY: window.scrollY || 0,
      detailScrollTop: detailPanelElement ? detailPanelElement.scrollTop : 0
    };
    localStorage.setItem(uiStateKey, JSON.stringify(payload));
  }

  function applyPendingUiRestore() {
    if (!state.pendingUiRestore || !detailPanelElement) return;
    const savedUiState = state.pendingUiRestore;
    if (savedUiState.selectedLocationId && savedUiState.selectedLocationId !== state.selectedLocationId) return;
    if (typeof savedUiState.detailScrollTop === 'number') detailPanelElement.scrollTop = savedUiState.detailScrollTop;
    if (typeof savedUiState.windowScrollY === 'number') window.scrollTo(0, savedUiState.windowScrollY);
    state.pendingUiRestore = null;
    localStorage.removeItem(uiStateKey);
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

  function fetchFavoriteLocations() {
    if (!favoriteListElement || !favoriteSummaryElement) return;

    favoriteSummaryElement.textContent = 'Loading favorites';
    favoriteListElement.innerHTML = '<p>Loading favorite locations.</p>';

    fetch('/location/favorites')
      .then(function (response) {
        return response.json().then(function (data) {
          if (!response.ok) throw new Error(data && data.error ? data.error : 'Could not load favorite locations');
          return data;
        });
      })
      .then(function (favoritesResponse) {
        if (!Array.isArray(favoritesResponse) || !favoritesResponse.length) {
          renderFavoriteLocations([]);
          return;
        }

        renderFavoriteLocations(favoritesResponse);
      })
      .catch(function (error) {
        favoriteSummaryElement.textContent = 'Could not load favorites';
        favoriteListElement.innerHTML = '<p class="error">' + escapeHtml(error.message || 'Could not load favorite locations') + '</p>';
      });
  }

  function renderFavoriteLocations(favorites) {
    if (!favoriteListElement || !favoriteSummaryElement) return;

    if (!Array.isArray(favorites) || !favorites.length) {
      favoriteSummaryElement.textContent = '0 favorites saved';
      favoriteListElement.innerHTML = '<p>No favorite locations yet.</p>';
      return;
    }

    favorites.sort(function (a, b) {
      return String(a.locationName || '').localeCompare(String(b.locationName || ''));
    });

    favoriteSummaryElement.textContent = favorites.length + ' favorite location' + (favorites.length === 1 ? '' : 's');
    let html = '<ul>';
    for (let i = 0; i < favorites.length; i++) {
      const location = favorites[i];
      html += '<li>';
      html += '<button type="button" class="location-favorite-button" data-location-id="' + escapeAttribute(location.id) + '">' + escapeHtml(location.locationName || 'Unknown location') + '</button>';
      if (location.locationType) html += ' <span> <strong>Type:</strong> ' + escapeHtml(location.locationType) + '</span>';
      if (location.address) html += ' <span> <strong>Address:</strong> ' + escapeHtml(location.address) + '</span>';
      html += '</li>';
    }
    html += '</ul>';
    favoriteListElement.innerHTML = html;

    const buttons = favoriteListElement.getElementsByClassName('location-favorite-button');
    for (let i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', function () {
        selectLocation(this.getAttribute('data-location-id'));
      });
    }
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
    detailPanelElement.focus();
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
    html += '<p><button type="button" id="locationReportOpen" data-location-id="' + escapeAttribute(location._idStr) + '">Report</button></p>';

    html += '<form action="/location/' + escapeAttribute(location._idStr) + '/favorite" method="post">';
    html += '<button type="submit">' + (location.isFavorite ? 'Unfavorite location' : 'Favorite location') + '</button>';
    html += '</form>';

    html += '<section>';
    html += '<h4>Ratings and Reviews</h4>';
    html += '<form action="/location/' + escapeAttribute(location._idStr) + '/rating" method="post">';
    html += '<p id="locationRatingFormError" class="error" role="alert"></p>';
    html += '<p><label for="rating-score">Score</label><br>';
    html += '<select id="rating-score" name="score" required>';
    html += '<option value="" disabled selected>Select score</option>'
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
    html += buildRatingsHtml(location.ratings, location._idStr);
    html += '</section>';

    html += '<section>';
    html += '<h4>Time Slots</h4>';
    html += '<form action="/location/' + escapeAttribute(location._idStr) + '/timeslots/range" method="post">';
    html += '<p id="locationTimeSlotFormError" class="error" role="alert"></p>';
    html += '<p><label for="slot-start">Start</label><br><input id="slot-start" type="datetime-local" name="startDateTime" step="900" required></p>';
    html += '<p><label for="slot-end">End</label><br><input id="slot-end" type="datetime-local" name="endDateTime" step="900" required></p>';
    html += '<p>Ranges snap to 15 minute blocks when saved.</p>';
    html += '<p><button type="submit">Create or join 15 minute range</button></p>';
    html += '</form>';
    html += buildTimeSlotsHtml(location);
    html += '</section>';

    html += '<section>';
    html += '<h4>Status Updates</h4>';
    html += '<form action="/location/' + escapeAttribute(location._idStr) + '/status" method="post">';
    html += '<p id="locationStatusFormError" class="error" role="alert"></p>';
    html += '<p><label for="status-body">Status update</label><br><textarea id="status-body" name="body" rows="3" required></textarea></p>';
    html += '<p><button type="submit">Post status update</button></p>';
    html += '</form>';
    if (pageMeta.isAdmin === true) {
      html += '<form action="/location/' + escapeAttribute(location._idStr) + '/status/clear" method="post">';
      html += '<button type="submit">Clear all statuses</button>';
      html += '</form>';
    }
    html += buildStatusesHtml(location);
    html += '</section>';

    html += '<section>';
    html += '<h4>Coordination Comments</h4>';
    html += '<form action="/location/' + escapeAttribute(location._idStr) + '/comment" method="post">';
      html += '<input type="hidden" name="parentId" value="">';
    html += '<p id="locationCommentFormError" class="error" role="alert"></p>';
    html += '<p><label for="comment-body">Comment</label><br><textarea id="comment-body" name="body" rows="3" maxlength="5000" required></textarea></p>';
    html += '<p><button type="submit">Post comment</button></p>';
    html += '</form>';
    html += buildCommentsHtml(location);
    html += '<dialog id="locationCommentReplyDialog">';
    html += '<h4>Reply</h4>';
    html += '<form id="locationCommentReplyForm" action="/location/' + escapeAttribute(location._idStr) + '/comment" method="post">';
    html += '<input type="hidden" name="parentId" id="location-comment-reply-parentid" value="">';
    html += '<p id="locationCommentReplyErrors" class="error" role="alert"></p>';
    html += '<p><label for="location-comment-reply-body">Your reply</label><br><textarea id="location-comment-reply-body" name="body" rows="4" maxlength="5000" required></textarea></p>';
    html += '<p><button type="submit">Reply</button> <button type="button" id="locationCommentReplyCancel">Cancel</button></p>';
    html += '</form>';
    html += '</dialog>';
    html += '<dialog id="locationCommentReportDialog">';
    html += '<h4>Report comment</h4>';
    html += '<form id="locationCommentReportForm" action="/location/' + escapeAttribute(location._idStr) + '/comment/COMMENT_ID/report" method="post">';
    html += '<p id="locationCommentReportErrors" class="error" role="alert"></p>';
    html += '<p><label for="location-comment-report-reason">Reason for report</label><br>';
    html += '<select id="location-comment-report-reason" name="reason">';
    html += '<option value="" disabled selected>Select reason</option>';
    html += '<option value="spam">Spam</option>';
    html += '<option value="harassment">Harassment</option>';
    html += '<option value="hate">Hate</option>';
    html += '<option value="violence">Violence</option>';
    html += '<option value="other">Other</option>';
    html += '</select></p>';
    html += '<p><label for="location-comment-report-description">Description</label><br><textarea id="location-comment-report-description" name="description" rows="4" maxlength="2000"></textarea></p>';
    html += '<p><button type="submit">Submit report</button> <button type="button" id="locationCommentReportCancel">Cancel</button></p>';
    html += '</form>';
    html += '</dialog>';
    html += '<dialog id="locationRatingReportDialog">';
    html += '<h4>Report rating</h4>';
    html += '<form id="locationRatingReportForm" action="/location/' + escapeAttribute(location._idStr) + '/rating/RATING_ID/report" method="post">';
    html += '<p id="locationRatingReportErrors" class="error" role="alert"></p>';
    html += '<p><label for="location-rating-report-reason">Reason for report</label><br>';
    html += '<select id="location-rating-report-reason" name="reason">';
    html += '<option value="" disabled selected>Select reason</option>';
    html += '<option value="spam">Spam</option>';
    html += '<option value="harassment">Harassment</option>';
    html += '<option value="hate">Hate</option>';
    html += '<option value="violence">Violence</option>';
    html += '<option value="other">Other</option>';
    html += '</select></p>';
    html += '<p><label for="location-rating-report-description">Description</label><br><textarea id="location-rating-report-description" name="description" rows="4" maxlength="2000"></textarea></p>';
    html += '<p><button type="submit">Submit report</button> <button type="button" id="locationRatingReportCancel">Cancel</button></p>';
    html += '</form>';
    html += '</dialog>';
    html += '<dialog id="locationRatingReplyDialog">';
    html += '<h4>Reply to rating</h4>';
    html += '<form id="locationRatingReplyForm" action="/location/' + escapeAttribute(location._idStr) + '/rating/RATING_ID/reply" method="post">';
    html += '<input type="hidden" name="parentId" id="location-rating-reply-parentid" value="">';
    html += '<p id="locationRatingReplyErrors" class="error" role="alert"></p>';
    html += '<p><label for="location-rating-reply-body">Your reply</label><br><textarea id="location-rating-reply-body" name="body" rows="4" required></textarea></p>';
    html += '<p><button type="submit">Reply</button> <button type="button" id="locationRatingReplyCancel">Cancel</button></p>';
    html += '</form>';
    html += '</dialog>';
    html += '<dialog id="locationRatingReplyReportDialog">';
    html += '<h4>Report rating reply</h4>';
    html += '<form id="locationRatingReplyReportForm" action="/location/' + escapeAttribute(location._idStr) + '/rating/RATING_ID/reply/REPLY_ID/report" method="post">';
    html += '<p id="locationRatingReplyReportErrors" class="error" role="alert"></p>';
    html += '<p><label for="location-rating-reply-report-reason">Reason for report</label><br>';
    html += '<select id="location-rating-reply-report-reason" name="reason">';
    html += '<option value="" disabled selected>Select reason</option>';
    html += '<option value="spam">Spam</option>';
    html += '<option value="harassment">Harassment</option>';
    html += '<option value="hate">Hate</option>';
    html += '<option value="violence">Violence</option>';
    html += '<option value="other">Other</option>';
    html += '</select></p>';
    html += '<p><label for="location-rating-reply-report-description">Description</label><br><textarea id="location-rating-reply-report-description" name="description" rows="4" maxlength="2000"></textarea></p>';
    html += '<p><button type="submit">Submit report</button> <button type="button" id="locationRatingReplyReportCancel">Cancel</button></p>';
    html += '</form>';
    html += '</dialog>';
    html += '<dialog id="locationStatusReportDialog">';
    html += '<h4>Report status</h4>';
    html += '<form id="locationStatusReportForm" action="/location/' + escapeAttribute(location._idStr) + '/status/STATUS_ID/report" method="post">';
    html += '<p id="locationStatusReportErrors" class="error" role="alert"></p>';
    html += '<p><label for="location-status-report-reason">Reason for report</label><br>';
    html += '<select id="location-status-report-reason" name="reason">';
    html += '<option value="" disabled selected>Select reason</option>';
    html += '<option value="spam">Spam</option>';
    html += '<option value="harassment">Harassment</option>';
    html += '<option value="hate">Hate</option>';
    html += '<option value="violence">Violence</option>';
    html += '<option value="other">Other</option>';
    html += '</select></p>';
    html += '<p><label for="location-status-report-description">Description</label><br><textarea id="location-status-report-description" name="description" rows="4" maxlength="2000"></textarea></p>';
    html += '<p><button type="submit">Submit report</button> <button type="button" id="locationStatusReportCancel">Cancel</button></p>';
    html += '</form>';
    html += '</dialog>';
    html += '<dialog id="locationReportDialog">';
    html += '<h4>Report</h4>';
    html += '<form id="locationReportForm" action="/location/' + escapeAttribute(location._idStr) + '/report" method="post">';
    html += '<p id="locationReportErrors" class="error" role="alert"></p>';
    html += '<p><label for="location-report-reason">Reason for report</label><br>';
    html += '<select id="location-report-reason" name="reason">';
    html += '<option value="" disabled selected>Select reason</option>';
    html += '<option value="spam">Spam</option>';
    html += '<option value="harassment">Harassment</option>';
    html += '<option value="hate">Hate</option>';
    html += '<option value="violence">Violence</option>';
    html += '<option value="other">Other</option>';
    html += '</select></p>';
    html += '<p><label for="location-report-description">Description</label><br><textarea id="location-report-description" name="description" rows="4" maxlength="2000"></textarea></p>';
    html += '<p><button type="submit">Submit report</button> <button type="button" id="locationReportCancel">Cancel</button></p>';
    html += '</form>';
    html += '</dialog>';
    html += '</section>';

    if (pageMeta.isAdmin) {
      html += '<section>';
      html += '<h4>Admin Edit Location</h4>';
      html += '<form action="/location/' + escapeAttribute(location._idStr) + '/update" method="post">';
      html += '<p id="locationEditFormError" class="error" role="alert"></p>';
      html += '<p><label for="edit-location-type">Location type</label><br>';
      html += '<select id="edit-location-type" name="locationType" required>';
      html += '<option value="" disabled>Select location type</option>';
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
    bindLocationDetailEvents(location);
    applyPendingUiRestore();
  }

  function buildRatingsHtml(ratings, locationIdStr) {
    if (!ratings || !ratings.length) return '<p>No ratings yet.</p>';
    let html = '<ul>';
    for (let i = 0; i < ratings.length; i++) {
      const rating = ratings[i];
      html += '<li>';
      html += '<p><strong>' + escapeHtml(rating.authorUsername || 'UNKNOWN') + '</strong> rated ' + escapeHtml(String(rating.score || '')) + '/5</p>';
      html += '<p>' + escapeHtml(rating.review || '') + '</p>';
      html += '<p>' + escapeHtml(rating.dateTimeLabel || '') + '</p>';
      if (locationIdStr && rating._idStr) {
        html += '<div class="location-rating-actions">';
        html += '<form action="/location/' + escapeAttribute(locationIdStr) + '/rating/' + escapeAttribute(rating._idStr) + '/like" method="post">';
        html += '<button type="submit">Like (' + escapeHtml(String(rating.likeCount || 0)) + ')</button>';
        html += '</form>';
        html += '<form action="/location/' + escapeAttribute(locationIdStr) + '/rating/' + escapeAttribute(rating._idStr) + '/dislike" method="post">';
        html += '<button type="submit">Dislike (' + escapeHtml(String(rating.dislikeCount || 0)) + ')</button>';
        html += '</form>';
        html += '<button type="button" class="locationRatingReportOpen" data-location-id="' + escapeAttribute(locationIdStr) + '" data-ratingid="' + escapeAttribute(rating._idStr) + '">Report</button>';
        if (canShowDeleteForOwnerContent(rating.isMine)) {
          html += '<form action="/location/' + escapeAttribute(locationIdStr) + '/rating/' + escapeAttribute(rating._idStr) + '/delete" method="post">';
          html += '<button type="submit">Delete rating</button>';
          html += '</form>';
        }
        html += '</div>';
        html += '<p class="location-rating-reply-trigger">';
        html += '<button type="button" class="locationRatingReplyOpen" data-location-id="' + escapeAttribute(locationIdStr) + '" data-ratingid="' + escapeAttribute(rating._idStr) + '" data-parent-reply-id="">Reply</button>';
        html += '</p>';
        if (rating.replyThreads && rating.replyThreads.length) {
          html += '<div class="commentTree rating-reply-tree">' + buildRatingReplyTreeHtml(locationIdStr, rating._idStr, rating.replyThreads) + '</div>';
        }
      }
      html += '</li>';
    }
    html += '</ul>';
    return html;
  }

  function buildTimeSlotsHtml(location) {
    if (!location.timeSlots || !location.timeSlots.length) return '<p>No time slots yet.</p>';
    let html = '<div class="locations-time-slots-list"><ul>';
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
    html += '</ul></div>';
    return html;
  }

  function buildStatusesHtml(location) {
    if (!location.statuses || !location.statuses.length) return '<p>No status updates yet.</p>';
    let html = '<ul>';
    for (let i = 0; i < location.statuses.length; i++) {
      const status = location.statuses[i];
      html += '<li>';
      html += '<p><strong>' + escapeHtml(status.authorUsername || 'UNKNOWN') + '</strong></p>';
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
      html += '<button type="button" class="locationStatusReportOpen" data-location-id="' + escapeAttribute(location._idStr) + '" data-statusid="' + escapeAttribute(status._idStr) + '">Report</button>';
      if (canShowDeleteForOwnerContent(status.isMine)) {
        html += '<form action="/location/' + escapeAttribute(location._idStr) + '/status/' + escapeAttribute(status._idStr) + '/delete" method="post">';
        html += '<button type="submit">Delete status</button>';
        html += '</form>';
      }
      html += '</li>';
    }
    html += '</ul>';
    return html;
  }

  function buildCommentsHtml(location) {
    if (!location.comments || !location.comments.length) return '<p>No comments yet.</p>';
    return '<div class="commentTree">' + buildCommentTreeHtml(location._idStr, location.comments) + '</div>';
  }

  function buildCommentTreeHtml(locationId, comments) {
    let html = '';
    for (let i = 0; i < comments.length; i++) {
      const comment = comments[i];
      html += '<div class="location-comment-card">';
      html += '<p><strong>' + escapeHtml(comment.authorUsername || 'UNKNOWN') + '</strong></p>';
      html += '<p>' + escapeHtml(comment.body || '') + '</p>';
      html += '<p>' + escapeHtml(comment.dateTimeLabel || '') + '</p>';
      html += '<div class="location-comment-actions">';
      html += '<form action="/location/' + escapeAttribute(locationId) + '/comment/' + escapeAttribute(comment._idStr) + '/like" method="post">';
      html += '<button type="submit">Like (' + escapeHtml(String(comment.likeCount || 0)) + ')</button>';
      html += '</form>';
      html += '<form action="/location/' + escapeAttribute(locationId) + '/comment/' + escapeAttribute(comment._idStr) + '/dislike" method="post">';
      html += '<button type="submit">Dislike (' + escapeHtml(String(comment.dislikeCount || 0)) + ')</button>';
      html += '</form>';
      html += '<button type="button" class="locationCommentReportOpen" data-location-id="' + escapeAttribute(locationId) + '" data-commentid="' + escapeAttribute(comment._idStr) + '">Report</button>';
      html += '<button type="button" class="locationCommentReplyOpen" data-location-id="' + escapeAttribute(locationId) + '" data-commentid="' + escapeAttribute(comment._idStr) + '">Reply</button>';
      if (canShowDeleteForOwnerContent(comment.isMine)) {
        html += '<form action="/location/' + escapeAttribute(locationId) + '/comment/' + escapeAttribute(comment._idStr) + '/delete" method="post">';
        html += '<button type="submit">Delete</button>';
        html += '</form>';
      }
      html += '</div>';
      if (comment.childrenCommentList && comment.childrenCommentList.length) {
        html += '<div class="commentTree">' + buildCommentTreeHtml(locationId, comment.childrenCommentList) + '</div>';
      }
      html += '</div>';
    }
    return html;
  }

  function buildRatingReplyTreeHtml(locationId, ratingId, replies) {
    let html = '';
    for (let i = 0; i < replies.length; i++) {
      const reply = replies[i];
      html += '<div class="location-comment-card location-rating-reply-card">';
      html += '<p><strong>' + escapeHtml(reply.authorUsername || 'UNKNOWN') + '</strong></p>';
      html += '<p>' + escapeHtml(reply.body || '') + '</p>';
      html += '<p>' + escapeHtml(reply.dateTimeLabel || '') + '</p>';
      html += '<div class="location-comment-actions">';
      html += '<form action="/location/' + escapeAttribute(locationId) + '/rating/' + escapeAttribute(ratingId) + '/reply/' + escapeAttribute(reply._idStr) + '/like" method="post">';
      html += '<button type="submit">Like (' + escapeHtml(String(reply.likeCount || 0)) + ')</button>';
      html += '</form>';
      html += '<form action="/location/' + escapeAttribute(locationId) + '/rating/' + escapeAttribute(ratingId) + '/reply/' + escapeAttribute(reply._idStr) + '/dislike" method="post">';
      html += '<button type="submit">Dislike (' + escapeHtml(String(reply.dislikeCount || 0)) + ')</button>';
      html += '</form>';
      html += '<button type="button" class="locationRatingReplyReportOpen" data-location-id="' + escapeAttribute(locationId) + '" data-ratingid="' + escapeAttribute(ratingId) + '" data-replyid="' + escapeAttribute(reply._idStr) + '">Report</button>';
      html += '<button type="button" class="locationRatingReplyOpen" data-location-id="' + escapeAttribute(locationId) + '" data-ratingid="' + escapeAttribute(ratingId) + '" data-parent-reply-id="' + escapeAttribute(reply._idStr) + '">Reply</button>';
      if (canShowDeleteForOwnerContent(reply.isMine)) {
        html += '<form action="/location/' + escapeAttribute(locationId) + '/rating/' + escapeAttribute(ratingId) + '/reply/' + escapeAttribute(reply._idStr) + '/delete" method="post">';
        html += '<button type="submit">Delete</button>';
        html += '</form>';
      }
      html += '</div>';
      if (reply.childrenCommentList && reply.childrenCommentList.length) {
        html += '<div class="commentTree">' + buildRatingReplyTreeHtml(locationId, ratingId, reply.childrenCommentList) + '</div>';
      }
      html += '</div>';
    }
    return html;
  }

  function bindLocationDetailEvents(location) {
    const replyDialog = document.getElementById('locationCommentReplyDialog');
    const replyForm = document.getElementById('locationCommentReplyForm');
    const replyParentInput = document.getElementById('location-comment-reply-parentid');
    const replyBodyInput = document.getElementById('location-comment-reply-body');
    const replyErrors = document.getElementById('locationCommentReplyErrors');
    const replyCancel = document.getElementById('locationCommentReplyCancel');
    const replyButtons = detailPanelElement.getElementsByClassName('locationCommentReplyOpen');
    const ratingForm = detailPanelElement.querySelector('form[action="/location/' + location._idStr + '/rating"]');
    const ratingFormError = document.getElementById('locationRatingFormError');
    const timeSlotForm = detailPanelElement.querySelector('form[action="/location/' + location._idStr + '/timeslots/range"]');
    const timeSlotFormError = document.getElementById('locationTimeSlotFormError');
    const statusForm = detailPanelElement.querySelector('form[action="/location/' + location._idStr + '/status"]');
    const statusFormError = document.getElementById('locationStatusFormError');
    const commentForm = detailPanelElement.querySelector('form[action="/location/' + location._idStr + '/comment"]');
    const commentFormError = document.getElementById('locationCommentFormError');
    const editForm = detailPanelElement.querySelector('form[action="/location/' + location._idStr + '/update"]');
    const editFormError = document.getElementById('locationEditFormError');
    const reportDialog = document.getElementById('locationReportDialog');
    const reportForm = document.getElementById('locationReportForm');
    const reportOpen = document.getElementById('locationReportOpen');
    const reportCancel = document.getElementById('locationReportCancel');
    const reportReason = document.getElementById('location-report-reason');
    const reportDescription = document.getElementById('location-report-description');
    const reportErrors = document.getElementById('locationReportErrors');
    const commentReportDialog = document.getElementById('locationCommentReportDialog');
    const commentReportForm = document.getElementById('locationCommentReportForm');
    const commentReportCancel = document.getElementById('locationCommentReportCancel');
    const commentReportReason = document.getElementById('location-comment-report-reason');
    const commentReportDescription = document.getElementById('location-comment-report-description');
    const commentReportErrors = document.getElementById('locationCommentReportErrors');
    const commentReportButtons = detailPanelElement.getElementsByClassName('locationCommentReportOpen');
    const ratingReportDialog = document.getElementById('locationRatingReportDialog');
    const ratingReportForm = document.getElementById('locationRatingReportForm');
    const ratingReportCancel = document.getElementById('locationRatingReportCancel');
    const ratingReportReason = document.getElementById('location-rating-report-reason');
    const ratingReportDescription = document.getElementById('location-rating-report-description');
    const ratingReportErrors = document.getElementById('locationRatingReportErrors');
    const ratingReportButtons = detailPanelElement.getElementsByClassName('locationRatingReportOpen');
    const ratingReplyDialog = document.getElementById('locationRatingReplyDialog');
    const ratingReplyForm = document.getElementById('locationRatingReplyForm');
    const ratingReplyParentInput = document.getElementById('location-rating-reply-parentid');
    const ratingReplyBodyInput = document.getElementById('location-rating-reply-body');
    const ratingReplyErrors = document.getElementById('locationRatingReplyErrors');
    const ratingReplyCancel = document.getElementById('locationRatingReplyCancel');
    const ratingReplyButtons = detailPanelElement.getElementsByClassName('locationRatingReplyOpen');
    const ratingReplyReportDialog = document.getElementById('locationRatingReplyReportDialog');
    const ratingReplyReportForm = document.getElementById('locationRatingReplyReportForm');
    const ratingReplyReportCancel = document.getElementById('locationRatingReplyReportCancel');
    const ratingReplyReportReason = document.getElementById('location-rating-reply-report-reason');
    const ratingReplyReportDescription = document.getElementById('location-rating-reply-report-description');
    const ratingReplyReportErrors = document.getElementById('locationRatingReplyReportErrors');
    const ratingReplyReportButtons = detailPanelElement.getElementsByClassName('locationRatingReplyReportOpen');
    const statusReportDialog = document.getElementById('locationStatusReportDialog');
    const statusReportForm = document.getElementById('locationStatusReportForm');
    const statusReportCancel = document.getElementById('locationStatusReportCancel');
    const statusReportReason = document.getElementById('location-status-report-reason');
    const statusReportDescription = document.getElementById('location-status-report-description');
    const statusReportErrors = document.getElementById('locationStatusReportErrors');
    const statusReportButtons = detailPanelElement.getElementsByClassName('locationStatusReportOpen');

    function resetLocationReportForm() {
      if (reportReason) reportReason.selectedIndex = 0;
      if (reportDescription) reportDescription.value = '';
      if (reportErrors) reportErrors.textContent = '';
    }

    function resetLocationCommentReportForm() {
      if (commentReportReason) commentReportReason.selectedIndex = 0;
      if (commentReportDescription) commentReportDescription.value = '';
      if (commentReportErrors) commentReportErrors.textContent = '';
    }

    function resetLocationRatingReportForm() {
      if (ratingReportReason) ratingReportReason.selectedIndex = 0;
      if (ratingReportDescription) ratingReportDescription.value = '';
      if (ratingReportErrors) ratingReportErrors.textContent = '';
    }

    function resetLocationRatingReplyReportForm() {
      if (ratingReplyReportReason) ratingReplyReportReason.selectedIndex = 0;
      if (ratingReplyReportDescription) ratingReplyReportDescription.value = '';
      if (ratingReplyReportErrors) ratingReplyReportErrors.textContent = '';
    }

    function resetLocationStatusReportForm() {
      if (statusReportReason) statusReportReason.selectedIndex = 0;
      if (statusReportDescription) statusReportDescription.value = '';
      if (statusReportErrors) statusReportErrors.textContent = '';
    }

    function validateRequiredBodyValue(value, emptyMessage, tooLongMessage, maxLength) {
      const text = parseRequiredTextValue(value);
      if (!text) return emptyMessage;
      if (typeof maxLength === 'number' && text.length > maxLength) return tooLongMessage;
      return '';
    }

    function validateRatingReplyBodyClient(raw) {
      if (raw !== undefined && raw !== null && typeof raw !== 'string') return 'Reply body must be text';
      const text = typeof raw === 'string' ? raw.trim() : String(raw || '').trim();
      if (!text) return 'Reply body is required';
      return '';
    }

    for (let i = 0; i < replyButtons.length; i++) {
      replyButtons[i].addEventListener('click', function () {
        const locationId = this.getAttribute('data-location-id') || location._idStr;
        const commentId = this.getAttribute('data-commentid') || '';
        if (replyForm && locationId) replyForm.setAttribute('action', '/location/' + locationId + '/comment');
        if (replyParentInput) replyParentInput.value = commentId;
        if (replyBodyInput) replyBodyInput.value = '';
        if (replyErrors) replyErrors.textContent = '';
        if (replyDialog && replyDialog.showModal) replyDialog.showModal();
        else if (replyDialog) replyDialog.setAttribute('open', '');
      });
    }

    if (reportOpen) {
      reportOpen.addEventListener('click', function () {
        const locationId = this.getAttribute('data-location-id') || location._idStr;
        resetLocationReportForm();
        if (reportForm && locationId) reportForm.setAttribute('action', '/location/' + locationId + '/report');
        if (reportDialog && reportDialog.showModal) reportDialog.showModal();
        else if (reportDialog) reportDialog.setAttribute('open', '');
      });
    }

    for (let i = 0; i < commentReportButtons.length; i++) {
      commentReportButtons[i].addEventListener('click', function () {
        const locationId = this.getAttribute('data-location-id') || location._idStr;
        const commentId = this.getAttribute('data-commentid') || '';
        resetLocationCommentReportForm();
        if (commentReportForm && locationId && commentId) commentReportForm.setAttribute('action', '/location/' + locationId + '/comment/' + commentId + '/report');
        if (commentReportDialog && commentReportDialog.showModal) commentReportDialog.showModal();
        else if (commentReportDialog) commentReportDialog.setAttribute('open', '');
      });
    }

    for (let i = 0; i < ratingReportButtons.length; i++) {
      ratingReportButtons[i].addEventListener('click', function () {
        const locationId = this.getAttribute('data-location-id') || location._idStr;
        const ratingId = this.getAttribute('data-ratingid') || '';
        resetLocationRatingReportForm();
        if (ratingReportForm && locationId && ratingId) ratingReportForm.setAttribute('action', '/location/' + locationId + '/rating/' + ratingId + '/report');
        if (ratingReportDialog && ratingReportDialog.showModal) ratingReportDialog.showModal();
        else if (ratingReportDialog) ratingReportDialog.setAttribute('open', '');
      });
    }

    for (let i = 0; i < ratingReplyButtons.length; i++) {
      ratingReplyButtons[i].addEventListener('click', function () {
        const locationId = this.getAttribute('data-location-id') || location._idStr;
        const ratingId = this.getAttribute('data-ratingid') || '';
        let parentReplyId = this.getAttribute('data-parent-reply-id');
        if (parentReplyId === null || parentReplyId === undefined) parentReplyId = '';
        if (ratingReplyForm && locationId && ratingId) {
          ratingReplyForm.setAttribute('action', '/location/' + locationId + '/rating/' + ratingId + '/reply');
        }
        if (ratingReplyParentInput) ratingReplyParentInput.value = parentReplyId;
        if (ratingReplyBodyInput) ratingReplyBodyInput.value = '';
        if (ratingReplyErrors) ratingReplyErrors.textContent = '';
        if (ratingReplyDialog && ratingReplyDialog.showModal) ratingReplyDialog.showModal();
        else if (ratingReplyDialog) ratingReplyDialog.setAttribute('open', '');
      });
    }

    for (let i = 0; i < ratingReplyReportButtons.length; i++) {
      ratingReplyReportButtons[i].addEventListener('click', function () {
        const locationId = this.getAttribute('data-location-id') || location._idStr;
        const ratingId = this.getAttribute('data-ratingid') || '';
        const replyId = this.getAttribute('data-replyid') || '';
        resetLocationRatingReplyReportForm();
        if (ratingReplyReportForm && locationId && ratingId && replyId) {
          ratingReplyReportForm.setAttribute('action', '/location/' + locationId + '/rating/' + ratingId + '/reply/' + replyId + '/report');
        }
        if (ratingReplyReportDialog && ratingReplyReportDialog.showModal) ratingReplyReportDialog.showModal();
        else if (ratingReplyReportDialog) ratingReplyReportDialog.setAttribute('open', '');
      });
    }

    for (let i = 0; i < statusReportButtons.length; i++) {
      statusReportButtons[i].addEventListener('click', function () {
        const locationId = this.getAttribute('data-location-id') || location._idStr;
        const statusId = this.getAttribute('data-statusid') || '';
        resetLocationStatusReportForm();
        if (statusReportForm && locationId && statusId) statusReportForm.setAttribute('action', '/location/' + locationId + '/status/' + statusId + '/report');
        if (statusReportDialog && statusReportDialog.showModal) statusReportDialog.showModal();
        else if (statusReportDialog) statusReportDialog.setAttribute('open', '');
      });
    }

    if (replyCancel && replyDialog && replyDialog.close) {
      replyCancel.addEventListener('click', function () {
        if (replyErrors) replyErrors.textContent = '';
        replyDialog.close();
      });
    } else if (replyCancel && replyDialog) {
      replyCancel.addEventListener('click', function () {
        if (replyErrors) replyErrors.textContent = '';
        replyDialog.removeAttribute('open');
      });
    }

    if (reportCancel && reportDialog && reportDialog.close) {
      reportCancel.addEventListener('click', function () {
        resetLocationReportForm();
        reportDialog.close();
      });
    } else if (reportCancel && reportDialog) {
      reportCancel.addEventListener('click', function () {
        resetLocationReportForm();
        reportDialog.removeAttribute('open');
      });
    }

    if (commentReportCancel && commentReportDialog && commentReportDialog.close) {
      commentReportCancel.addEventListener('click', function () {
        resetLocationCommentReportForm();
        commentReportDialog.close();
      });
    } else if (commentReportCancel && commentReportDialog) {
      commentReportCancel.addEventListener('click', function () {
        resetLocationCommentReportForm();
        commentReportDialog.removeAttribute('open');
      });
    }

    if (ratingReportCancel && ratingReportDialog && ratingReportDialog.close) {
      ratingReportCancel.addEventListener('click', function () {
        resetLocationRatingReportForm();
        ratingReportDialog.close();
      });
    } else if (ratingReportCancel && ratingReportDialog) {
      ratingReportCancel.addEventListener('click', function () {
        resetLocationRatingReportForm();
        ratingReportDialog.removeAttribute('open');
      });
    }

    if (ratingReplyCancel && ratingReplyDialog && ratingReplyDialog.close) {
      ratingReplyCancel.addEventListener('click', function () {
        if (ratingReplyErrors) ratingReplyErrors.textContent = '';
        ratingReplyDialog.close();
      });
    } else if (ratingReplyCancel && ratingReplyDialog) {
      ratingReplyCancel.addEventListener('click', function () {
        if (ratingReplyErrors) ratingReplyErrors.textContent = '';
        ratingReplyDialog.removeAttribute('open');
      });
    }

    if (ratingReplyReportCancel && ratingReplyReportDialog && ratingReplyReportDialog.close) {
      ratingReplyReportCancel.addEventListener('click', function () {
        resetLocationRatingReplyReportForm();
        ratingReplyReportDialog.close();
      });
    } else if (ratingReplyReportCancel && ratingReplyReportDialog) {
      ratingReplyReportCancel.addEventListener('click', function () {
        resetLocationRatingReplyReportForm();
        ratingReplyReportDialog.removeAttribute('open');
      });
    }

    if (statusReportCancel && statusReportDialog && statusReportDialog.close) {
      statusReportCancel.addEventListener('click', function () {
        resetLocationStatusReportForm();
        statusReportDialog.close();
      });
    } else if (statusReportCancel && statusReportDialog) {
      statusReportCancel.addEventListener('click', function () {
        resetLocationStatusReportForm();
        statusReportDialog.removeAttribute('open');
      });
    }

    if (reportForm) {
      reportForm.addEventListener('submit', function (event) {
        let reason = '';
        if (reportReason && reportReason.value) reason = String(reportReason.value).trim();
        let description = '';
        if (reportDescription && reportDescription.value) description = reportDescription.value.trim();
        if (reportErrors) reportErrors.textContent = '';
        if (!reason) {
          event.preventDefault();
          if (reportErrors) reportErrors.textContent = 'Error: Select a reason,';
          return;
        }
        if (!description) {
          event.preventDefault();
          if (reportErrors) reportErrors.textContent = 'Error: Enter a description,';
        }
      });
    }

    if (commentReportForm) {
      commentReportForm.addEventListener('submit', function (event) {
        let reason = '';
        if (commentReportReason && commentReportReason.value) reason = String(commentReportReason.value).trim();
        let description = '';
        if (commentReportDescription && commentReportDescription.value) description = commentReportDescription.value.trim();
        if (commentReportErrors) commentReportErrors.textContent = '';
        if (!reason) {
          event.preventDefault();
          if (commentReportErrors) commentReportErrors.textContent = 'Error: Select a reason,';
          return;
        }
        if (!description) {
          event.preventDefault();
          if (commentReportErrors) commentReportErrors.textContent = 'Error: Enter a description,';
        }
      });
    }

    if (ratingReportForm) {
      ratingReportForm.addEventListener('submit', function (event) {
        let reason = '';
        if (ratingReportReason && ratingReportReason.value) reason = String(ratingReportReason.value).trim();
        let description = '';
        if (ratingReportDescription && ratingReportDescription.value) description = ratingReportDescription.value.trim();
        if (ratingReportErrors) ratingReportErrors.textContent = '';
        if (!reason) {
          event.preventDefault();
          if (ratingReportErrors) ratingReportErrors.textContent = 'Error: Select a reason,';
          return;
        }
        if (!description) {
          event.preventDefault();
          if (ratingReportErrors) ratingReportErrors.textContent = 'Error: Enter a description,';
        }
      });
    }

    if (ratingReplyReportForm) {
      ratingReplyReportForm.addEventListener('submit', function (event) {
        let reason = '';
        if (ratingReplyReportReason && ratingReplyReportReason.value) reason = String(ratingReplyReportReason.value).trim();
        let description = '';
        if (ratingReplyReportDescription && ratingReplyReportDescription.value) description = ratingReplyReportDescription.value.trim();
        if (ratingReplyReportErrors) ratingReplyReportErrors.textContent = '';
        if (!reason) {
          event.preventDefault();
          if (ratingReplyReportErrors) ratingReplyReportErrors.textContent = 'Error: Select a reason,';
          return;
        }
        if (!description) {
          event.preventDefault();
          if (ratingReplyReportErrors) ratingReplyReportErrors.textContent = 'Error: Enter a description,';
        }
      });
    }

    if (statusReportForm) {
      statusReportForm.addEventListener('submit', function (event) {
        let reason = '';
        if (statusReportReason && statusReportReason.value) reason = String(statusReportReason.value).trim();
        let description = '';
        if (statusReportDescription && statusReportDescription.value) description = statusReportDescription.value.trim();
        if (statusReportErrors) statusReportErrors.textContent = '';
        if (!reason) {
          event.preventDefault();
          if (statusReportErrors) statusReportErrors.textContent = 'Error: Select a reason,';
          return;
        }
        if (!description) {
          event.preventDefault();
          if (statusReportErrors) statusReportErrors.textContent = 'Error: Enter a description,';
        }
      });
    }

    if (ratingForm) {
      ratingForm.addEventListener('submit', function (event) {
        if (ratingFormError) ratingFormError.textContent = '';
        const score = ratingForm.elements.score ? String(ratingForm.elements.score.value || '').trim() : '';
        const review = ratingForm.elements.review ? String(ratingForm.elements.review.value || '').trim() : '';
        if (!score) {
          event.preventDefault();
          if (ratingFormError) ratingFormError.textContent = 'Rating score is required';
          return;
        }
        const scoreNum = Number(score);
        if (Number.isNaN(scoreNum) || !Number.isInteger(scoreNum) || scoreNum < 1 || scoreNum > 5) {
          event.preventDefault();
          if (ratingFormError) ratingFormError.textContent = 'Rating score must be between 1 and 5';
          return;
        }
        if (!review) {
          event.preventDefault();
          if (ratingFormError) ratingFormError.textContent = 'Review is required';
        }
      });
    }

    if (timeSlotForm) {
      timeSlotForm.addEventListener('submit', function (event) {
        if (timeSlotFormError) timeSlotFormError.textContent = '';
        const startDateTime = timeSlotForm.elements.startDateTime ? String(timeSlotForm.elements.startDateTime.value || '').trim() : '';
        const endDateTime = timeSlotForm.elements.endDateTime ? String(timeSlotForm.elements.endDateTime.value || '').trim() : '';
        if (!startDateTime) {
          event.preventDefault();
          if (timeSlotFormError) timeSlotFormError.textContent = 'Start date and time is required';
          return;
        }
        if (!endDateTime) {
          event.preventDefault();
          if (timeSlotFormError) timeSlotFormError.textContent = 'End date and time is required';
          return;
        }
        const startDate = new Date(startDateTime);
        const endDate = new Date(endDateTime);
        if (Number.isNaN(startDate.getTime())) {
          event.preventDefault();
          if (timeSlotFormError) timeSlotFormError.textContent = 'Start date and time is invalid';
          return;
        }
        if (Number.isNaN(endDate.getTime())) {
          event.preventDefault();
          if (timeSlotFormError) timeSlotFormError.textContent = 'End date and time is invalid';
          return;
        }
        if (endDate <= startDate) {
          event.preventDefault();
          if (timeSlotFormError) timeSlotFormError.textContent = 'End time must be after start time';
        }
      });
    }

    if (statusForm) {
      statusForm.addEventListener('submit', function (event) {
        if (statusFormError) statusFormError.textContent = '';
        const errorText = validateRequiredBodyValue(
          statusForm.elements.body ? statusForm.elements.body.value : '',
          'Status update is required',
          '',
          null
        );
        if (errorText) {
          event.preventDefault();
          if (statusFormError) statusFormError.textContent = errorText;
        }
      });
    }

    if (commentForm) {
      commentForm.addEventListener('submit', function (event) {
        if (commentFormError) commentFormError.textContent = '';
        const errorText = validateRequiredBodyValue(
          commentForm.elements.body ? commentForm.elements.body.value : '',
          'Comment body is required',
          'Comment is too long',
          5000
        );
        if (errorText) {
          event.preventDefault();
          if (commentFormError) commentFormError.textContent = errorText;
        }
      });
    }

    if (replyForm) {
      replyForm.addEventListener('submit', function (event) {
        if (replyErrors) replyErrors.textContent = '';
        const errorText = validateRequiredBodyValue(
          replyForm.elements.body ? replyForm.elements.body.value : '',
          'Comment body is required',
          'Comment is too long',
          5000
        );
        if (errorText) {
          event.preventDefault();
          if (replyErrors) replyErrors.textContent = errorText;
        }
      });
    }

    if (ratingReplyForm) {
      ratingReplyForm.addEventListener('submit', function (event) {
        if (ratingReplyErrors) ratingReplyErrors.textContent = '';
        const bodyVal = ratingReplyForm.elements.body ? ratingReplyForm.elements.body.value : '';
        const errorText = validateRatingReplyBodyClient(bodyVal);
        if (errorText) {
          event.preventDefault();
          if (ratingReplyErrors) ratingReplyErrors.textContent = errorText;
          return;
        }
        const ratingReplySubmitBtns = ratingReplyForm.querySelectorAll('button[type="submit"]');
        for (let rbi = 0; rbi < ratingReplySubmitBtns.length; rbi++) ratingReplySubmitBtns[rbi].disabled = true;
      });
    }

    if (ratingReplyBodyInput && ratingReplyErrors) {
      ratingReplyBodyInput.addEventListener('input', function () {
        const err = validateRatingReplyBodyClient(ratingReplyBodyInput.value);
        if (!err) ratingReplyErrors.textContent = '';
      });
    }

    if (editForm) {
      editForm.addEventListener('submit', function (event) {
        if (editFormError) editFormError.textContent = '';
        const errorText = validateLocationInputValues({
          locationType: editForm.elements.locationType ? editForm.elements.locationType.value : '',
          locationName: editForm.elements.locationName ? editForm.elements.locationName.value : '',
          latitude: editForm.elements.latitude ? editForm.elements.latitude.value : '',
          longitude: editForm.elements.longitude ? editForm.elements.longitude.value : '',
          numCourts: editForm.elements.numCourts ? editForm.elements.numCourts.value : ''
        });
        if (errorText) {
          event.preventDefault();
          if (editFormError) editFormError.textContent = errorText;
        }
      });
    }
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
 
