chrome.runtime.sendMessage({ type: "GET_TABS" }, (resp) => {
  if (!resp) return;
  const groups = resp.tabs || {};
  const total = Object.values(groups).reduce((s, arr) => s + arr.length, 0);
  document.getElementById("tabCount").textContent = total;
  document.getElementById("groupCount").textContent = Object.keys(groups).length;
});

document.getElementById("openManager").addEventListener("click", () => {
  chrome.tabs.create({ url: "chrome://newtab" });
  window.close();
});
