const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        } else {
            entry.target.classList.remove('visible'); // Remove on exit to allow repeat
        }
    });
}, { threshold: 0.1 });

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.fly-in-right').forEach(el => {
        observer.observe(el);
    });
    document.querySelectorAll('.fly-in-left').forEach(el => {
        observer.observe(el);
    });
});

function toggleStyleSheet(){

    // Task 1
    // Steps
    // 1 (a) Get style element by ID (hint: getElementById)
    var element = document.getElementById("mainStyleSheet");
    
    // 1 (b) Check the current stylesheet file name. (hint: element.getAttribute)
    var name = element.getAttribute("href");
   
    // 1 (c) Determine new stylesheet file name
    if(name == "dark.css") {
        name = "light.css";
    }
    else {
        name = "dark.css";
    }
   

    // 1 (d) replace stylesheet with new stylesheet (hint: element.setAttribute)
    element.setAttribute("href", name);


    // TASK 2
    // 2 (d) For persistence when page is refreshed. save new stylesheet name to localStorage
    // hint: localStorage.setItem(name, value)
    localStorage.setItem("style", name);
}


window.onload = function(){
    // TASK 2
    // TODO: Make the last div color persist even when someone refreshes the page.

    // Steps
    // 2 (a) get stylesheet name from local storage hint: localStorage.getItem(name)
    var style = localStorage.getItem("style");
    // 2 (b) get html style element by ID
    var element = document.getElementById("mainStyleSheet");
    // 2 (c) replace href attribute of html element.
    if(style=="dark.css"||style=="light.css")
    {
        element.setAttribute("href", style);
    }
}