let date = new Date();
let year = date.getFullYear();
let month = date.getMonth(); // Months are zero-indexed
let day = date.getDate();
let timeHrs = date.getHours();
let timeMins = date.getMinutes();
let timeSuffix = " AM";

if (timeHrs > 12){
    timeHrs -= 12;
    timeSuffix = " PM"
}

const monthArr = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Pad month and day with leading zeros if necessary for consistent formatting
day = day.toString().padStart(2, "0");
timeHrs = timeHrs.toString().padStart(2, "0");
timeMins = timeMins.toString().padStart(2, "0");

let formattedDate = day + " " + monthArr[month] + " " + year + ", " + timeHrs + ":" + timeMins + timeSuffix;

document.getElementById("post_date").innerText = formattedDate;

function getURLQueryString(){
    
    const url = window.location.href;

    // Split the URL at the question mark
    const parts = url.split("?");

    // Assuming there's data after the question mark (safer approach to check first)
    if (parts.length > 1) {
        const queryString = parts[1];
        return queryString;
    } else {
        return "Error";
    }
}

let url = 'https://blog-backend-0w7q.onrender.com/add-post';
let taskSuccess = 'added';
let taskFailed = 'adding';

async function addPost(postData) {
    
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: postData
    });

    if (!response.ok) {
        throw new Error(`Error ${taskFailed} post: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Post added successfully!', data);
    alert(`Post ${taskSuccess} successfully!`);
    window.location.reload(false);
}

function getPostTags(){
    const tagsObject = document.getElementById("tags").children;
    let tagsArray = [];

    if (tagsObject.length > 0){

        let tagsList = [...tagsObject];

        tagsList.forEach(tag => {
            tagsArray.push(tag.innerText.replace(/X$/, ""))
        });
    } else {
        alert("Please enter atleast 1 tag.");
    }
    return tagsArray;
}

function flattenTableData(tableData) {
  const flattenedData = [];
  tableData.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      flattenedData.push({
        row: rowIndex + 1,
        column: colIndex + 1,
        value: cell
      });
    });
  });
  return flattenedData;
}

let data = {};
let modData = {};
const saveButton = document.getElementById("saveButton");
saveButton.addEventListener('click', () => {
    
    if (saveButton.getAttribute("data-update") == "true")
    {
        url = 'https://blog-backend-0w7q.onrender.com/update-post';
        modData.id = document.getElementById("post_id").innerText;
        taskSuccess = "updated";
        taskFailed = "updating"
    }        

    editor.save().then( savedData => {
        const title = document.getElementById("title").innerText;
        let author =  document.getElementById("post_auth").innerText;
        author = author != "" ? author : "Bhargav V";
        if (title != ""){
            modData.tags = getPostTags();
            if (modData.tags.length < 1){
                return;
            }
            if (saveButton.getAttribute("data-update") == "true")
            {
                modData.slug = getURLQueryString();
            }
            modData.title = title;
            modData.content = savedData;
            modData.author = author;
            data = JSON.stringify(modData, null, 4);
            if (data){
                addPost(data);
            }
        } else{
            alert("Please enter a title!");
        }
    })
})

// Get the tags and input elements from the DOM 
const tags = document.getElementById('tags'); 
const input = document.getElementById('input-tag'); 

function removeCommasPeriods(str) {
    return str.replace(/[,.]/g, "");
  }
  
  function handleTagInput(){
      
      // Prevent the default action of the keypress 
      // event (submitting the form) 
      event.preventDefault();
      
      // Create a new list item element for the tag 
      const tag = document.createElement('li'); 
    
      // Get the trimmed value of the input element 
      const tagContent = removeCommasPeriods(input.value.trim()); 
    
      // If the trimmed value is not an empty string 
      if (tagContent !== '') { 
    
          // Set the text content of the tag to  
          // the trimmed value 
          tag.innerText = tagContent; 
  
          // Add a delete button to the tag 
          tag.innerHTML += '<button class="delete-button">X</button>'; 
            
          // Append the tag to the tags list 
          tags.appendChild(tag); 
            
          // Clear the input element's value 
          input.value = ''; 
      } 
  }
  
  // Add an event listener for keyup on the input element 
  input.addEventListener('input', function (event) { 
  
      // Check if the key pressed is 'Enter' 
      if (event.data === ',' || event.data === ' ' || event.data === '.') { 
          handleTagInput();
      } 
  });
  
  // Add an event listener for keydown on the input element 
  input.addEventListener('keydown', function (event) { 
  
      // Check if the key pressed is 'Enter' 
      if (event.key === 'Enter') { 
          handleTagInput();
      } 
  }); 

// Add an event listener for click on the tags list 
tags.addEventListener('click', function (event) { 

    // If the clicked element has the class 'delete-button' 
    if (event.target.classList.contains('delete-button')) { 
      
        // Remove the parent element (the tag) 
        event.target.parentNode.remove(); 
    } 
}); 

// Disable enter on title field.
document.getElementById("title").addEventListener("keydown", (ev) => {
    if (ev.key == "Enter"){
        ev.preventDefault();
    }
})