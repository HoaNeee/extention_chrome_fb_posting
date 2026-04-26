function showNotify({ message, type = "info", duration = 3000 }) {
  let bgr = "";
  let color = "";

  switch (type) {
    case "success":
      bgr = "#28a745";
      color = "#fff";
      break;
    case "error":
      bgr = "#ef214a";
      color = "#fff";
      break;
    case "warning":
      bgr = "#e8f54c";
      color = "#000";
      break;
    default:
      bgr = "#28a745";
      color = "#fff";
      break;
  }

  const toastifyEl = Toastify({
    text: message,
    duration: duration,
    close: true,
    gravity: "top",
    position: "left",
    stopOnFocus: true,
    offset: {
      y: 50,
    },
    style: {
      background: bgr,
      color: color,
    },
  });
  toastifyEl.showToast();
}

export { showNotify };
