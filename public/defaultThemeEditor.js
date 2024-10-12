const savedMode = localStorage.getItem('themeMode') || 'dark';
    
let currentTheme;

function setDefaultThemeEditor(){
    if (savedMode == "dark" || savedMode == "Dark"){
        document.documentElement.style.setProperty('--bg-color', '#121212');
        document.documentElement.style.setProperty('--color', 'bisque');
        document.documentElement.style.setProperty('--ph-color', '#ccc');
        document.documentElement.style.setProperty('--lg-color', 'rgba(128, 128, 128, 0.02)');
        currentTheme = 0;
    } else{
        document.documentElement.style.setProperty('--bg-color', '#cccccc');
        document.documentElement.style.setProperty('--color', '#121212');
        document.documentElement.style.setProperty('--ph-color', '#333');
        document.documentElement.style.setProperty('--lg-color', 'rgba(0, 0, 0, 0.05)');
        currentTheme = 1;
    }
}

setDefaultThemeEditor();

function toggleTheme(){

    if (currentTheme === 0){
        document.documentElement.style.setProperty('--bg-color', '#cccccc');
        document.documentElement.style.setProperty('--color', '#121212');
        document.documentElement.style.setProperty('--ph-color', '#333');
        let tableElement = document.getElementsByClassName("tc-wrap")
        if (tableElement == undefined){
            tableElement[0].style.setProperty('--color-border', '#000');
        }
        document.documentElement.style.setProperty('--lg-color', 'rgba(0, 0, 0, 0.05)');
        document.getElementById("dark").style.display = "none";
        document.body.setAttribute('data-theme', 'light');
        currentTheme = 1;

        const linkElement = document.querySelector('link[href="prefer_style.css"]'); // Example selection by href attribute

        if (linkElement) {
            linkElement.parentNode.removeChild(linkElement);
        }

        // Save the mode to local storage.
        localStorage.setItem('themeMode', 'Light');
    }
    else if (currentTheme === 1){
        document.documentElement.style.setProperty('--bg-color', '#121212');
        document.documentElement.style.setProperty('--color', 'bisque');
        document.documentElement.style.setProperty('--ph-color', '#ccc');
        let tableElement = document.getElementsByClassName("tc-wrap")
        if (tableElement == undefined){
            tableElement[0].style.setProperty('--color-border', '#e8e8eb');
        }
        document.documentElement.style.setProperty('--lg-color', 'rgba(128, 128, 128, 0.02)');
        document.getElementById("dark").style.display = "block";
        document.body.setAttribute('data-theme', 'dark');
        currentTheme = 0;

        const linkElementExist = document.querySelector('link[href="prefer_style.css"]'); // Example selection by href attribute

        if (!linkElementExist) {
            const linkElement = document.createElement('link');
            linkElement.rel = 'stylesheet';
            linkElement.href = 'prefer_style.css'; // Replace with your stylesheet path
            
            // Get reference to the body element
            const body = document.body;
            
            // Append the link element to the body (effectively adding it at the end)
            body.appendChild(linkElement);
        }

        // Save the mode to local storage.
        localStorage.setItem('themeMode', 'Dark');
    }
}