const fileSelector = document.getElementById('file-selector');
fileSelector.addEventListener('change', (event) => {
    const fileList = event.target.files;
});
const dropArea = document.getElementById('drop-area');

dropArea.addEventListener('dragover', (event) => {
    event.stopPropagation();
    event.preventDefault();
    // Style the drag-and-drop as a "copy file" operation.
    event.dataTransfer.dropEffect = 'copy';
});

// Listener that's triggered on click
fileSelector.addEventListener("change", event => {
    event.stopPropagation();
    event.preventDefault();

    const spinner = document.querySelector(".calculation-spinner");
    spinner.style = "display: block;"

    const messageElement = document.getElementById("message");
    messageElement.style = "display: none";

    const reader = new FileReader();

    reader.addEventListener("load", event => {
        const file = event.target.result;

        hashPDFDocument(file, (hash) => {
            spinner.style = "display: none;"

            messageElement.style = "display: block;"
            messageElement.innerHTML = `Your document fingerprint is: <br><p class="hash">${hash}</p>`
        });
    })

    const fileList = event.target.files;
    if (fileList.length > 0 && fileList.length < 2) {
        reader.readAsDataURL(fileList[0])
    }

})

// Listener that's triggered on drop-in
dropArea.addEventListener('drop', (event) => {
    event.stopPropagation();
    event.preventDefault();
    const fileList = event.dataTransfer.files;

    const spinner = document.querySelector(".calculation-spinner");
    spinner.style = "display: block;"

    const messageElement = document.getElementById("message");
    messageElement.style = "display: none";

    // we can access the file here
    const reader = new FileReader();
    reader.addEventListener("load", event => {
        const file = event.target.result;

        hashPDFDocument(file, (hash) => {
            spinner.style = "display: none;"

            messageElement.style = "display: block;"
            messageElement.innerHTML = `Your document fingerprint is: <br><p class="hash">${hash}</p>`
        });
    })

    if (fileList.length > 0 && fileList.length < 2) {
        reader.readAsDataURL(fileList[0])
    }
});