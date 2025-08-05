document.getElementById('predictForm').addEventListener('submit', function (e) {
  e.preventDefault();

  // Animate button on click
  const button = document.querySelector(".glow-button");
  button.classList.add("pulse-on-click");
  setTimeout(() => button.classList.remove("pulse-on-click"), 600); // remove after animation

  const loaderWrapper = document.getElementById('loader');
  const resultBox = document.getElementById('result');
  const priceSpan = document.getElementById('price');
  const summaryBox = document.getElementById('summary');

  // Reset previous result
  priceSpan.innerText = '--';
  summaryBox.innerHTML = '';
  loaderWrapper.style.display = 'flex';
  resultBox.style.opacity = 0;

  // Gather inputs
  const brand = document.getElementById('brand').value;
  const model = document.getElementById('model').value;
  const year = parseInt(document.getElementById('year').value);
  const km = parseInt(document.getElementById('kmDriven').value);
  const fuel = document.getElementById('fuel').value;
  const transmission = document.getElementById('transmission').value;
  const owners = document.getElementById('owners').value;
  const color = document.getElementById('color').value;

  const frontImage = document.getElementById('frontImage').files[0];
  const backImage = document.getElementById('backImage').files[0];
  const leftImage = document.getElementById('leftImage').files[0];
  const rightImage = document.getElementById('rightImage').files[0];

  // Form data for Flask
  const formData = new FormData();
  formData.append("brand", brand);
  formData.append("model", model);
  formData.append("year", year);
  formData.append("kmDriven", km);
  formData.append("fuel", fuel);
  formData.append("transmission", transmission);
  formData.append("owners", owners);
  formData.append("color", color);
  formData.append("frontImage", frontImage);
  formData.append("backImage", backImage);
  formData.append("leftImage", leftImage);
  formData.append("rightImage", rightImage);

  // Call Flask API
  fetch("http://127.0.0.1:5000/predict", {
    method: "POST",
    body: formData
  })
    .then(res => res.json())
    .then(data => {
      priceSpan.innerText = data.predicted_price;

      summaryBox.innerHTML = `
        <b>🛠️ Damage Summary</b><br>
        Front: ${data.damage_summary.front}<br>
        Back: ${data.damage_summary.back}<br>
        Left: ${data.damage_summary.left}<br>
        Right: ${data.damage_summary.right}
      `;

      loaderWrapper.style.display = 'none';
      resultBox.style.opacity = 1;
      resultBox.style.animation = 'fadeIn 0.8s ease-in-out';
    })
    .catch(error => {
      loaderWrapper.style.display = 'none';
      alert("Something went wrong. Check backend logs.");
      console.error("Prediction Error:", error);
    });
});

// ========== Background Animation ==========
const canvas = document.getElementById('backgroundCanvas');
const ctx = canvas.getContext('2d');
let lines = [];

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

function createLines(count = 30) {
  for (let i = 0; i < count; i++) {
    lines.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      speed: 2 + Math.random() * 4,
      length: 60 + Math.random() * 80,
      opacity: 0.15 + Math.random() * 0.25,
    });
  }
}
createLines();

function animateLines() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  lines.forEach(line => {
    ctx.beginPath();
    ctx.strokeStyle = `rgba(255, 215, 0, ${line.opacity})`;
    ctx.moveTo(line.x, line.y);
    ctx.lineTo(line.x + line.length, line.y);
    ctx.stroke();

    line.x += line.speed;
    if (line.x > canvas.width) {
      line.x = -line.length;
      line.y = Math.random() * canvas.height;
    }
  });
  requestAnimationFrame(animateLines);
}
animateLines();

// ========== Preview Uploaded Images ==========
function showPreview(input, previewId) {
  const file = input.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      document.getElementById(previewId).src = reader.result;
    };
    reader.readAsDataURL(file);
  }
}

document.getElementById('frontImage').addEventListener('change', function () {
  showPreview(this, 'previewFront');
});
document.getElementById('backImage').addEventListener('change', function () {
  showPreview(this, 'previewBack');
});
document.getElementById('leftImage').addEventListener('change', function () {
  showPreview(this, 'previewLeft');
});
document.getElementById('rightImage').addEventListener('change', function () {
  showPreview(this, 'previewRight');
});
