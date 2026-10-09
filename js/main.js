// main.js — boot sequence: wires up the boot screen's buttons and hands
// off to ui_world.js for era/realm selection once "Begin a new line" is
// clicked.

document.addEventListener("DOMContentLoaded", () => {

    function showScreen(id) {
        document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
        document.getElementById(id).classList.add("active");
    }

    document.getElementById("newBtn").addEventListener("click", () => {
        showScreen("eraSelect");
        if (typeof renderEraSelect === "function") renderEraSelect();
    });

    // Back navigation between the pre-game screens. Each target screen's
    // content is still in the DOM from when it was last rendered forward —
    // showScreen() only toggles which .screen is visible — so no
    // re-render is needed going backward.
    document.getElementById("eraBackBtn").addEventListener("click", () => {
        showScreen("boot");
    });
    document.getElementById("realmBackBtn").addEventListener("click", () => {
        showScreen("eraSelect");
    });
    document.getElementById("characterBackBtn").addEventListener("click", () => {
        showScreen("realmSelect");
    });

});
