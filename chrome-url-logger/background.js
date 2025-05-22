chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed");
  sendLog("Extension installed");
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    const msg = `Tab updated: ${tab.url}`;
    console.log(msg);
    sendLog(msg);
  }
});

function sendLog(message) {
  fetch('http://localhost:5000/log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ log: message })
  }).catch(err => console.error("Error sending log:", err));
}
