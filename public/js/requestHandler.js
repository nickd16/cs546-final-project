/** script file for DOM event handler functions for creating location requests */

let form = document.getElementById("requestForm");
let categorySelect = document.getElementById("requestCategory");
let buttonSubmit = document.getElementById("submitRequest");
let formError = document.getElementById("locationRequestFormError");

const hideClass = (className, isHidden) => {
  const divInputs = document.getElementsByClassName(className);
  for (let i = 0; i < divInputs.length; i++) {
    divInputs[i].hidden = isHidden;
  }
}
 
// Helper functions for parsing and validating values
const parseRequiredTextValue = (value) => {
  return typeof value === 'string' ? value.trim() : '';
};
 
const parseOptionalNumberValue = (value) => {
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
};
 
const validateCommonFields = (values) => {
  // Validate location name
  const locationName = parseRequiredTextValue(values.locationName || '');
  if (!locationName) return 'Location name is required';
 
  // Validate latitude and longitude
  const latitudeText = parseRequiredTextValue(values.latitude || '');
  const longitudeText = parseRequiredTextValue(values.longitude || '');
  
  if (!latitudeText) return 'Latitude is required';
  if (!longitudeText) return 'Longitude is required';
 
  const latitude = parseOptionalNumberValue(latitudeText);
  const longitude = parseOptionalNumberValue(longitudeText);
 
  if (latitude === null) return 'Latitude must be a valid number';
  if (longitude === null) return 'Longitude must be a valid number';
  if (latitude < -90 || latitude > 90) return 'Latitude must be between -90 and 90';
  if (longitude < -180 || longitude > 180) return 'Longitude must be between -180 and 180';
 
  // Validate address
  const address = parseRequiredTextValue(values.address || '');
  if (!address) return 'Address is required';
 
  // Validate description
  const description = parseRequiredTextValue(values.description || '');
  if (!description) return 'Description is required';
 
  // Validate body
  const body = parseRequiredTextValue(values.body || '');
  if (!body) return 'Body text is required';
 
  return '';
};
 
const validateNumCourts = (numCourtsText) => {
  if (!numCourtsText) return ''; // optional field
  
  const numCourts = Number(numCourtsText.trim());
  if (isNaN(numCourts)) return 'Number of courts must be a valid number';
  if (!Number.isInteger(numCourts)) return 'Number of courts must be a whole number';
  if (numCourts < 0) return 'Number of courts cannot be negative';
  
  return '';
};
 
const validateBasketballInputs = (values) => {
  let error = validateCommonFields(values);
  if (error) return error;
   error = validateNumCourts(values.numCourts || '');
  if (error) return error;
 
  return '';
};
 
const validateTennisInputs = (values) => {
  let error = validateCommonFields(values);
  if (error) return error;
 
  error = validateNumCourts(values.numCourts || '');
  if (error) return error;
 
  const tennisType = parseRequiredTextValue(values.tennisType || '');

 
  return '';
};
 
const validateHandballInputs = (values) => {
  let error = validateCommonFields(values);
  if (error) return error;
 
  error = validateNumCourts(values.numCourts || '');
  if (error) return error;
 
  return '';
};
 
const validateHikingInputs = (values) => {
  let error = validateCommonFields(values);
  if (error) return error;
 
  const length = parseRequiredTextValue(values.length || '');
  const difficulty = parseRequiredTextValue(values.difficulty || '');
  const otherDetails = parseRequiredTextValue(values.otherDetails || '');
 
  const limitedAccess = parseRequiredTextValue(values.limitedAccess || '');
 
  return '';
};
 
const validateRequestInputs = (values, categoryFilter) => {
  if (!categoryFilter || categoryFilter === 'unselected') {
    return 'Location type is required';
  }
 
  switch (categoryFilter.toLowerCase()) {
    case 'basketball':
      return validateBasketballInputs(values);
    case 'tennis':
      return validateTennisInputs(values);
    case 'handball':
      return validateHandballInputs(values);
    case 'hiking':
      return validateHikingInputs(values);
    default:
      return 'Invalid category';
  }
};


if (categorySelect) {
    categorySelect.addEventListener("change", (event) => {
        event.preventDefault();
        let category = event.target.value;
        
        if (category == "unselected") {
            buttonSubmit.hidden = true;
        }
        else {
            buttonSubmit.hidden = false;
        }

        if (category == "basketball") {
            // hide all other inputs
            hideClass("tennis", true);
            hideClass("hiking", true);
            hideClass("handball", true);

            // reseting the inputs to only show inputs for basketball
            hideClass("basketball", false);
        }
        else if (category == "tennis") {
            // hide all other inputs
            hideClass("hiking", true);
            hideClass("handball", true);
            hideClass("basketball", true);
            
            // reseting the inputs to only show inputs for basketball
            hideClass("tennis", false);

        }
        else if (category == "hiking") {
            // hide all other inputs
            hideClass("handball", true);
            hideClass("basketball", true);
            hideClass("tennis", true);
            
            // reseting the inputs to only show inputs for basketball
            hideClass("hiking", false);

        }
        else if (category == "handball") {
            // hide all other inputs
            hideClass("basketball", true);
            hideClass("tennis", true);
            hideClass("hiking", true);
            
            // reseting the inputs to only show inputs for basketball
            hideClass("handball", false);

        }
        else {
            // category is undefined hide submit

            hideClass("basketball", true);
            hideClass("tennis", true);
            hideClass("hiking", true);
            hideClass("handball", true);
        }
    })
}

if (form) {
      form.addEventListener('submit', function (event) {
        if (formError) formError.textContent = '';
        event.preventDefault();
 
        // Get category from the select element
        const categoryFilter = categorySelect ? categorySelect.value : '';
 
        // Build values object from form elements
        const values = {
          categoryFilter: categoryFilter,
          locationName: form.elements.locationName ? form.elements.locationName.value : '',
          latitude: form.elements.latitude ? form.elements.latitude.value : '',
          longitude: form.elements.longitude ? form.elements.longitude.value : '',
          address: form.elements.address ? form.elements.address.value : '',
          description: form.elements.description ? form.elements.description.value : '',
          body: form.elements.body ? form.elements.body.value : '',
          numCourts: form.elements.numCourts ? form.elements.numCourts.value : '',
          accessible: form.elements.accessible ? form.elements.accessible.checked : false,
          indoorOutdoor: form.elements.indoorOutdoor ? form.elements.indoorOutdoor.checked : false,
          tennisType: form.elements.tennisType ? form.elements.tennisType.value : '',
          length: form.elements.length ? form.elements.length.value : '',
          difficulty: form.elements.difficulty ? form.elements.difficulty.value : '',
          otherDetails: form.elements.otherDetails ? form.elements.otherDetails.value : '',
          limitedAccess: form.elements.limitedAccess ? form.elements.limitedAccess.value : ''
        };
 
        // Validate based on category
        const errorText = validateRequestInputs(values, categoryFilter);
        
        if (errorText) {
          event.preventDefault();
          if (formError) formError.textContent = errorText;
          return; // Stop form submission
        }
 
        // form submit
        form.submit();

    });
}
