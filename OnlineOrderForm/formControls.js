let currentTab = 0;

let locationElements = [];
let locations = [];

var formPages;
var nextBtn;
var prevBtn;
var form;

var addAnotherBtn;
var cancelInputBtn;

var visibleLocations = [];

let filesToAppend = [];

// variables for custom select box
var x, i, j, l, ll, selElmnt, a, b, c, d, locIcon, dropdownArrow;
var addressIterator;

var observer = new MutationObserver(function (mutations) {
  if ($("#formContainer").length) {
    initializeFormVariables();
    observer.disconnect();
  }
});

if ($("#formContainer").length) {
  initializeFormVariables();
} else {
  observer.observe(document.querySelector(".order-online"), {
    childList: true,
    subtree: true,
  });
}

function initializeFormVariables() {
  console.log("form loaded, initializing javascript...");

  retrieveLocationData();

  formPages = Array.from(document.querySelectorAll("form .page"));
  nextBtn = document.querySelectorAll("form .nextButton");
  prevBtn = document.querySelectorAll("form .prevButton");
  submitBtn = document.querySelector("form .submitButton");
  form = document.querySelector("#onlineOrderForm");

  addAnotherBtn = document.querySelectorAll("form .formInputListAddBtn");
  cancelInputBtn = document.querySelectorAll(".formInputCancelButton");

  // Event handlers for the next and previous buttons
  nextBtn.forEach((button) => {
    button.addEventListener("click", (e) => {
      changePage("next");
    });
  });
  prevBtn.forEach((button) => {
    button.addEventListener("click", (e) => {
      changePage("previous");
    });
  });

  submitBtn.addEventListener("click", (e) => {
    submitBtn.disabled = true;
    submitBtn.style.opacity = "0.5";
    submitBtn.innerText = "Submitting...";

    // If honeyput has a value in it, redirect without submitting the form
    if (
      document.getElementsByClassName("contact_me_by_fax_only")[0].value !== ""
    ) {
      window.location.href =
        "https://www.procare-pharmacy.ca/online-order-redirect";
      return;
    }

    sendPatientEmail()
      .then((res) => {
        console.log(res);
        sendFormSubmission()
          .then((res) => {
            window.location.href =
              "https://www.procare-pharmacy.ca/online-order-redirect";
          })
          .catch((e) => {
            console.log(e);
          });
      })
      .catch((e) => {
        console.log(e);
      });
  });

  addAnotherBtn.forEach((button) => {
    button.addEventListener("click", (e) => {
      addInputBox(e.target.closest(".page"));
    });
  });

  cancelInputBtn.forEach((button) => {
    button.addEventListener("click", (e) => {
      e.target.parentElement.getElementsByClassName(
        "formTextInputClearBtn"
      )[0].value = "";
    });
  });

  // Whenever a file is uploaded, show the user how many files are added
  $(".formFileInputBoxUploadInput").change((input) => {
    filesToAppend = input.target.files;
    input.target.parentElement.getElementsByClassName(
      "formFileInputBoxUploadLabel"
    )[0].innerText = `${filesToAppend.length} files added`;
  });

  // Handler for div around radio button
  Array.from($(".buttonLabelPair")).forEach((button) => {
    button.addEventListener("click", (e) => {
      e.target.getElementsByTagName("input")[0].checked = true;
    });
  });

  // Change form data before submitting
  form.addEventListener("formdata", (e) => {
    const formData = e.formData;

    let emptyRecords = [];
    for (const pair of formData.entries()) {
      if (pair[1] === "") {
        emptyRecords.push(pair[0]);
      }
      if (pair[0] === "attachment" && pair[1].name === "") {
        emptyRecords.push(pair[0]);
      }
    }

    emptyRecords.forEach((key) => {
      formData.delete(key);
    });

    // if (filesToAppend.length) {
    //   filesToAppend.forEach((file) =>
    //     formData.append("file" + filesToAppend.indexOf(file), file)
    //   );
    // }
  });

  initializeCustomSelect();
  populateLocationAddresses();

  /* If the user clicks anywhere outside the select box,
    then close all select boxes: */
  document.addEventListener("click", closeAllSelect);
}

// Change the form page after clicking a navigation button
function changePage(btn) {
  // Get current index value and active page
  let index = 0;
  const active = document.querySelector("form .page.active");
  index = formPages.indexOf(active);

  if (active.classList.contains("required") && btn === "next") {
    if (validatePage()) {
      return;
    }
  }

  // Check if the page affects logic
  if (active.classList.contains("affectsLogic")) {
    // Get radio buttons to see which one is checked
    let options = active.getElementsByClassName("formRadioButtons")[0].getElementsByTagName("input");

    // Send the checked value as the modifier for changeVisiblePages (businessLogic.js)
    for (i = 0; i < options.length; i++) {
      if (options[i].checked) {
        changeVisiblePages(options[i].value);
        break;
      }
    }
  }

  // Remove active class from current active page
  formPages[index].classList.remove("active");

  do {
    if (btn === "next" && index + 1 < formPages.length) {
      index++;
    } else if (btn === "previous" && index > 0) {
      index--;
    }
  } while (formPages[index].classList.contains("outOfLogic"));

  formPages[index].classList.add("active");
}

// Check if the user's page input is valid
function validatePage() {
  const activePage = $(".page.active");

  const selectErrorText = "Field is required";
  const radioErrorText = "Field is required";
  const fileErrorText = "Please attach a file";
  const dateErrorText = "Please type a date";
  const textInputErrorText = "Please type a response";
  const multiTextInputErrorText = "Field is required";
  const textInputAddErrorText = "Please input at least 1 item";

  // Figure out the type of control on the page
  if (activePage[0].classList.contains("select")) {
    // Check if select tag is empty
    if (activePage[0].getElementsByTagName("select")[0].value === "") {
      // Check if error text is already displayed
      if (activePage[0].classList.contains("error")) {
        return true;
      }

      createErrorText(activePage, selectErrorText);
      return true;
    } else {
      activePage[0].classList.remove("error");
      disableErrorText(activePage);
      return false;
    }
  } else if (activePage[0].classList.contains("radio")) {
    let flag = false;

    // Check if no radio button is selected
    Array.from(activePage[0].querySelectorAll("input")).forEach((input) => {
      if (input.checked) {
        activePage[0].classList.remove("error");
        disableErrorText(activePage);
        flag = true;
        return;
      }
    });

    // If an input was checked, return false
    if (flag) {
      return false;
    }

    // Check if error text is already displayed
    if (activePage[0].classList.contains("error")) {
      return true;
    }

    createErrorText(activePage, radioErrorText);
    return true;
  } else if (activePage[0].classList.contains("file")) {
    // Check if a file is uploaded
    if (
      activePage.find(".formFileInputBoxUploadInput")[0].files.length === 0 &&
      filesToAppend.length === 0
    ) {
      // Check if error text is already displayed
      if (activePage[0].classList.contains("error")) {
        return true;
      }

      createErrorText(activePage, fileErrorText);
      return true;
    } else {
      activePage[0].classList.remove("error");
      disableErrorText(activePage);
      return false;
    }
  } else if (activePage[0].classList.contains("date")) {
    // Check if a date is input
    if (activePage[0].getElementsByTagName("input")[0].value === "") {
      // Check if error text is already displayed
      if (activePage[0].classList.contains("error")) {
        return true;
      }

      createErrorText(activePage, dateErrorText);
      return true;
    } else {
      activePage[0].classList.remove("error");
      disableErrorText(activePage);
      return false;
    }
  } else if (activePage[0].classList.contains("text")) {
    // Check if the input is populated with text
    if (activePage[0].getElementsByTagName("input")[0].value === "") {
      // Check if error text is already displayed
      if (activePage[0].classList.contains("error")) {
        return true;
      }

      createErrorText(activePage, textInputErrorText);
      return true;
    } else {
      activePage[0].classList.remove("error");
      disableErrorText(activePage);
      return false;
    }
  } else if (activePage[0].classList.contains("text-multiple")) {
    var containsError = false;
    // Check if the inputs are populated with text
    Array.from(activePage[0].getElementsByTagName("input")).forEach((input) => {
      if (input.value === "") {
        containsError = true;
      }
    });

    // Check if error flag was raised after validating
    if (containsError) {
      // Check if error text is already displayed
      if (activePage[0].classList.contains("error")) {
        return true;
      }

      createErrorText(activePage, multiTextInputErrorText);
      return true;
    }

    activePage[0].classList.remove("error");
    disableErrorText(activePage);
    return false;
  } else if (activePage[0].classList.contains("text-add")) {
    // Check if the first input is populated with text
    if (activePage[0].getElementsByTagName("input")[0].value === "") {
      // Check if error text is already displayed
      if (activePage[0].classList.contains("error")) {
        return true;
      }

      createErrorText(activePage, textInputAddErrorText);
      return true;
    } else {
      activePage[0].classList.remove("error");
      disableErrorText(activePage);
      return false;
    }
  }

  return false;
}

function createErrorText(page, message) {
  errorMessage = page.find(".errorMessage");

  //errorMessage.css("visibility", "visible");
  errorMessage.html("* " + message);
}

function disableErrorText(page) {
  errorMessage = page.find(".errorMessage");

  errorMessage.html("*");
}

// Add an input and input cancel button to a list of inputs
function addInputBox(currentPage) {
  const inputList = currentPage.getElementsByClassName(
    "formInputListWithAddButton"
  )[0];

  if (inputList.getElementsByClassName("formInputCancelButtonPair").length >= 5)
    return;

  // Create empty elements for formInputCancelButtonPair, formTextInput, and formInputCancelButton
  const newInputCancelBtnPair = document.createElement("div");
  const newInput = document.createElement("input");
  const newInputCancelBtn = document.createElement("img");

  // Get the number of inputs in the list
  const inputCount = Array.from(
    inputList.getElementsByClassName("formTextInput")
  ).length;

  // Create container for input and button
  newInputCancelBtnPair.classList.add("formInputCancelButtonPair");

  // Create new input to add to the list
  newInput.id = inputList.id + "Entry" + (inputCount + 1);
  newInput.name = inputList.name + " - " +(inputCount + 1);
  newInput.classList.add("formTextInput");
  newInput.classList.add("formTextInputClearBtn");
  newInput.type = "text";
  newInput.placeholder = "Enter RX number here";

  // Create accompanying input cancel button
  newInputCancelBtn.src =
    "https://uploads-ssl.webflow.com/65e765b5fb8859b0fba8914f/65f5d1f0751c83c1e16ec20b_input-cancel.svg";
  newInputCancelBtn.classList.add("formInputCancelButton");
  newInputCancelBtn.id = inputList.id + "CancelBtn" + (inputCount + 1);

  // Add button event listener
  newInputCancelBtn.addEventListener("click", (e) => {
    e.target.parentElement.remove();

    // Check if list is no longer full
    if (
      inputList.getElementsByClassName("formInputCancelButtonPair").length < 5
    )
      currentPage.getElementsByClassName(
        "formInputListAddBtn"
      )[0].style.display = "flex";
  });

  // Add the elements to the list
  inputList.appendChild(newInputCancelBtnPair);
  newInputCancelBtnPair.appendChild(newInput);
  newInputCancelBtnPair.appendChild(newInputCancelBtn);

  // Check if the add button needs locked
  if (inputList.getElementsByClassName("formInputCancelButtonPair").length >= 5)
    currentPage.getElementsByClassName("formInputListAddBtn")[0].style.display =
      "none";
}

// Handle file drop event
function dropHandler(ev) {
  ev.preventDefault();

  document.querySelector(".formFileInputBoxUploadInput").files =
    ev.dataTransfer.files;

  // Trigger label to change
  document.querySelector(".formFileInputBoxUploadLabel").innerText = `${
    document.querySelector(".formFileInputBoxUploadInput").files.length
  } files added`;
}

function dragOverHandler(ev) {
  ev.preventDefault();
}

function manuallyUploadFile(inputID) {
  //document.getElementById("prescriptionUploadFileInput").click();
  console.log("Opening file dialog...");
}

function initializeCustomSelect() {
  /* Look for any elements with the class "custom-select": */
  x = document.getElementsByClassName("custom-select");
  l = x.length;
  for (i = 0; i < l; i++) {
    selElmnt = x[i].getElementsByTagName("select")[0];
    ll = selElmnt.length;
    /* For each element, create a new DIV that will act as the selected item: */
    a = document.createElement("DIV");
    a.setAttribute("class", "select-selected");

    dropdownArrow = document.createElement("img");
    dropdownArrow.src =
      "https://uploads-ssl.webflow.com/65e765b5fb8859b0fba8914f/65f5e5c4751c83c1e18126d8_dropdown-arrow.svg";
    dropdownArrow.classList.add("select-selected-arrow");

    a.innerHTML = selElmnt.options[selElmnt.selectedIndex].innerHTML;
    x[i].appendChild(a);

    /* For each element, create a new DIV that will contain the option list: */
    b = document.createElement("DIV");
    b.setAttribute("class", "select-items select-hide");
    for (j = 1; j < ll; j++) {
      /* For each option in the original select element,
        create a new DIV that will act as an option item: */
      c = document.createElement("DIV");
      c.classList.add("select-items-option");

      d = document.createElement("DIV");
      d.classList.add("select-items-option-info");

      locIcon = document.createElement("img");
      locIcon.classList.add("locIcon");
      locIcon.src =
        "https://uploads-ssl.webflow.com/65e765b5fb8859b0fba8914f/65f882bec4faf3945d75c71e_location_on.svg";

      let optTitle = document.createElement("p");
      let optAddress = document.createElement("p");

      optTitle.classList.add("optionName");
      optAddress.classList.add("optionAddress");

      optTitle.innerHTML = selElmnt.options[j].innerHTML;
      // replace with fetching address from CMS
      optAddress.innerHTML = "Address Number " + j;

      d.appendChild(optTitle);
      d.appendChild(optAddress);

      c.appendChild(locIcon);
      c.appendChild(d);

      c.addEventListener("click", function (e) {
        /* When an item is clicked, update the original select box,
            and the selected item: */
        var y, i, k, s, h, sl, yl;
        s = this.parentNode.parentNode.getElementsByTagName("select")[0];
        sl = s.length;
        h = this.parentNode.previousSibling;
        for (i = 0; i < sl; i++) {
          if (
            s.options[i].innerHTML == this.children[1].children[0].innerHTML
          ) {
            s.selectedIndex = i;
            h.innerHTML = this.children[1].children[0].innerHTML;
            y = this.parentNode.getElementsByClassName("same-as-selected");
            yl = y.length;

            // Change what email gets cc'd
            try {
              document.getElementById("pharmacyEmail").value =
                visibleLocations[s.selectedIndex - 1].dataset.formemail;
            } catch (error) {
              console.error(error);
            }

            // Change what phone number gets attached
            try {
              document.getElementById("pharmacyPhoneNumber").value =
                visibleLocations[s.selectedIndex - 1].dataset.locphonenumber;
            } catch (error) {
              console.error(error);
            }

            for (k = 0; k < yl; k++) {
              y[k].classList.remove("same-as-selected");
            }
            this.children[1].children[0].classList.add("same-as-selected");
            break;
          }
        }
        h.click();
      });
      b.appendChild(c);
    }
    x[i].appendChild(b);
    x[i].appendChild(dropdownArrow);
    a.addEventListener("click", function (e) {
      /* When the select box is clicked, close any other select boxes,
        and open/close the current select box: */
      e.stopPropagation();
      closeAllSelect(this);
      this.nextSibling.classList.toggle("select-hide");
      dropdownArrow.classList.toggle("select-arrow-active");
    });
  }
}

function closeAllSelect(elmnt) {
  /* A function that will close all select boxes in the document,
    except the current select box: */
  var x,
    y,
    i,
    xl,
    yl,
    arrNo = [];
  x = document.getElementsByClassName("select-items");
  y = document.getElementsByClassName("select-selected");
  xl = x.length;
  yl = y.length;
  for (i = 0; i < yl; i++) {
    if (elmnt == y[i]) {
      arrNo.push(i);
    } else {
      y[i].classList.remove("select-arrow-active");
    }
  }
  for (i = 0; i < xl; i++) {
    if (arrNo.indexOf(i)) {
      x[i].classList.add("select-hide");
    }
  }
}

async function sendPatientEmail() {
  var formData = new FormData(form);

  var locationLabel = formData.get("Location");
  var location = Array.from(locationElements).find(
    (element) => locationLabel === element.dataset.loclabel
  );

  try {
    return $.ajax({
      url: "https://us-central1-procare-scarborough.cloudfunctions.net/submission/sendPatientEmail",
      type: "GET",
      data: {
        locationEmail: location.dataset.formemail,
        locationNumber: location.dataset.locphonenumber,
        patientName: formData.get("Full Patient Name - First Name"),
        patientEmail: formData.get("Patient Email"),
      },
    }).then((res) => {
      console.log("Email sent!");
      return res;
    });
  } catch (error) {
    console.log(error);
    return;
  }
}

async function sendFormSubmission() {
  var formData = new FormData(form);

  try {
    return $.ajax({
      url: "https://us-central1-procare-scarborough.cloudfunctions.net/submission/sendFormSubmissionEmail",
      type: "POST",
      data: formData,
      processData: false,
      contentType: false,
    }).then((res) => {
      console.log("Pharmacy email sent!");
      return res;
    });
  } catch (error) {
    console.log(error);
    return;
  }
}

// Get locations data from the CMS and populate the form
function retrieveLocationData() {
  locationElements = document.querySelectorAll("div[id^='LOCATIONID_");
  locationElements.forEach((element) => {
    if (element.dataset.excludelocation == "false") {
      var location = document.createElement("option");
      location.value = element.dataset.loclabel;
      location.text = element.dataset.loclabel;
      location.setAttribute("formEmail", element.dataset.formemail);
      location.classList.add("selectOption");
      document.getElementById("selectLocationDropdown").appendChild(location);
      visibleLocations.push(element);
    }
  });
}

function populateLocationAddresses() {
  addressFields = document.querySelectorAll(".optionAddress");

  for (
    addressIterator = 0;
    addressIterator < addressFields.length;
    addressIterator++
  ) {
    addressFields[addressIterator].innerHTML =
      locationElements[addressIterator].dataset.address;
  }
}
