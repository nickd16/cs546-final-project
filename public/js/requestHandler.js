/** script file for DOM event handler functions for creating location requests */

let form = document.getElementById("requestForm");
let categorySelect = document.getElementById("requestCategory");
let buttonSubmit = document.getElementById("submitRequest");


const hideClass = (className, isHidden) => {
  const divInputs = document.getElementsByClassName(className);
  for (let i = 0; i < divInputs.length; i++) {
    divInputs[i].hidden = isHidden;
  }
}

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