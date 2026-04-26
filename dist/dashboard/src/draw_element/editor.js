function drawEditor({ id, anchorElement = document.body, onRemove }) {
  try {
    // const div = `<div id="${prefix}editor-content" style="height: auto; min-height: 80px"></div>`;

    const selector = `tm_editor-content-${id}`;
    const outlerDiv = document.createElement("div");
    outlerDiv.style.position = "relative";

    const div = document.createElement("div");
    div.setAttribute("id", selector);
    div.classList.add("tm_editor-content-class");
    div.style.height = "auto";
    div.style.minHeight = "80px";
    // div.style.border = "var(--tm-border) solid var(--tm-input-border)";
    div.style.position = "relative";

    const removeDiv = document.createElement("div");
    removeDiv.setAttribute("id", `tm_editor-content-close-${id}`);
    removeDiv.style.position = "absolute";
    removeDiv.style.right = "4px";
    removeDiv.style.top = "4px";
    removeDiv.style.cursor = "pointer";
    removeDiv.innerText = "✖";

    outlerDiv.appendChild(div);
    if (id !== 1) {
      outlerDiv.appendChild(removeDiv);
    }

    anchorElement?.appendChild(outlerDiv);

    removeDiv.addEventListener("click", () => {
      outlerDiv.remove();
      onRemove?.();
    });

    const Quill = window.Quill;
    const quill = new Quill(div, {
      theme: "snow",
      modules: {
        toolbar: [["bold", "italic", "underline", "strike"]],
      },
    });

    return quill;
  } catch (e) {
    console.log("Error at drawEditor: ", e);
    // throw new Error("Error at drawEditor: " + e);
  }
}

export { drawEditor };
