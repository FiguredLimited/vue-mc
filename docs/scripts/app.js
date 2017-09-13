var menu      = document.getElementsByTagName('menu')[0];
var toggle    = document.getElementById('menu');
var menuItems = document.querySelectorAll('menu a');

/**
 * Hides the mobile menu.
 */
function hideMobileMenu() {
    if (toggle.checked) {
        toggle.checked = false;
        menu.scrollTop = 0;
    }
}

// We want to make sure the menu is hidden if we're accessing an anchor.
window.addEventListener('hashchange', hideMobileMenu);

// When clicking a menu link, make sure the menu disappears.
for (var i = 0; i < menuItems.length; i++) {
    menuItems[i].addEventListener('click', hideMobileMenu);
}

// Enable scroll spy with a delay to allow for anchor scrolling.
var timeout = window.location.hash ? 1000 : 0;

setTimeout(function() {
    gumshoe.init({
        selector:       'menu ul a', // Default link selector (must use a valid CSS selector)
        selectorHeader: 'header',    // Fixed header selector (must use a valid CSS selector)
        activeClass:    'current',   // Class to apply to active navigation link and its parent list item
        offset:         30,

        callback: function(e) {
            if (e) {
                history.replaceState(null, null, '#' + e.target.id);
            }
        }
    });
}, timeout);

// "Redirect" to the first menu item if none are currently active.
if (window.location.hash == false) {
    window.location.hash = menuItems[0].href.split('#')[1];
}

hideMobileMenu();
