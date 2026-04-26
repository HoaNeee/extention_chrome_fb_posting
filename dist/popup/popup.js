const btnOpenDashboard = document.getElementById("btnOpenDashboard");
console.log(btnOpenDashboard);
btnOpenDashboard.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "OPEN_DASHBOARD" });
  window.close();
});
