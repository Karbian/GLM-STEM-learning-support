const state = {
  angleDeg: 45,
  draggingCircle: false,
};

const notableAngles = [
  0, 30, 45, 60, 90, 120, 135, 150, 180,
  210, 225, 240, 270, 300, 315, 330, 360,
];

const elements = {
  angleSlider: document.getElementById("angleSlider"),
  angleDegrees: document.getElementById("angleDegrees"),
  angleRadians: document.getElementById("angleRadians"),
  quadrantLabel: document.getElementById("quadrantLabel"),
  sineValue: document.getElementById("sineValue"),
  cosineValue: document.getElementById("cosineValue"),
  tangentValue: document.getElementById("tangentValue"),
  referenceAngle: document.getElementById("referenceAngle"),
  showSine: document.getElementById("showSine"),
  showCosine: document.getElementById("showCosine"),
  showTangent: document.getElementById("showTangent"),
  snapAngles: document.getElementById("snapAngles"),
  circleCanvas: document.getElementById("circleCanvas"),
  triangleCanvas: document.getElementById("triangleCanvas"),
  graphCanvas: document.getElementById("graphCanvas"),
  presets: document.querySelectorAll(".preset"),
};

const circleCtx = elements.circleCanvas.getContext("2d");
const triangleCtx = elements.triangleCanvas.getContext("2d");
const graphCtx = elements.graphCanvas.getContext("2d");

function clampAngle(angle) {
  let normalized = angle % 360;
  if (normalized < 0) normalized += 360;
  return normalized;
}

function maybeSnap(angle) {
  if (!elements.snapAngles.checked) return angle;
  return notableAngles.reduce((closest, current) => {
    return Math.abs(current - angle) < Math.abs(closest - angle) ? current : closest;
  }, notableAngles[0]);
}

function toRadians(angleDeg) {
  return angleDeg * Math.PI / 180;
}

function formatValue(value) {
  if (!Number.isFinite(value)) return "undefined";
  const rounded = Math.abs(value) < 0.0005 ? 0 : value;
  return rounded.toFixed(3);
}

function quadrantFromAngle(angle) {
  if (angle === 0 || angle === 90 || angle === 180 || angle === 270 || angle === 360) {
    return "Axis";
  }
  if (angle < 90) return "I";
  if (angle < 180) return "II";
  if (angle < 270) return "III";
  return "IV";
}

function referenceAngleFrom(angle) {
  if (angle <= 90) return angle;
  if (angle <= 180) return 180 - angle;
  if (angle <= 270) return angle - 180;
  return 360 - angle;
}

function updateState(nextAngle) {
  state.angleDeg = maybeSnap(clampAngle(nextAngle));
  elements.angleSlider.value = state.angleDeg;
  render();
}

function drawAxes(ctx, width, height, pad) {
  ctx.strokeStyle = "rgba(19, 38, 47, 0.18)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, height / 2);
  ctx.lineTo(width - pad, height / 2);
  ctx.moveTo(width / 2, pad);
  ctx.lineTo(width / 2, height - pad);
  ctx.stroke();
}

function drawUnitCircle(angleRad, sine, cosine) {
  const { width, height } = elements.circleCanvas;
  const center = { x: width / 2, y: height / 2 };
  const radius = 148;
  const point = {
    x: center.x + cosine * radius,
    y: center.y - sine * radius,
  };

  circleCtx.clearRect(0, 0, width, height);
  drawAxes(circleCtx, width, height, 36);

  circleCtx.strokeStyle = "rgba(19, 38, 47, 0.16)";
  circleCtx.lineWidth = 1;
  for (let degree = 0; degree < 360; degree += 30) {
    const rad = toRadians(degree);
    circleCtx.beginPath();
    circleCtx.moveTo(center.x, center.y);
    circleCtx.lineTo(center.x + Math.cos(rad) * radius, center.y - Math.sin(rad) * radius);
    circleCtx.stroke();
  }

  circleCtx.strokeStyle = "#13262f";
  circleCtx.lineWidth = 3;
  circleCtx.beginPath();
  circleCtx.arc(center.x, center.y, radius, 0, Math.PI * 2);
  circleCtx.stroke();

  circleCtx.strokeStyle = "#ef476f";
  circleCtx.lineWidth = 4;
  circleCtx.beginPath();
  circleCtx.moveTo(center.x, center.y);
  circleCtx.lineTo(point.x, point.y);
  circleCtx.stroke();

  circleCtx.strokeStyle = "#118ab2";
  circleCtx.lineWidth = 3;
  circleCtx.beginPath();
  circleCtx.moveTo(point.x, point.y);
  circleCtx.lineTo(point.x, center.y);
  circleCtx.stroke();

  circleCtx.strokeStyle = "#06d6a0";
  circleCtx.beginPath();
  circleCtx.moveTo(center.x, center.y);
  circleCtx.lineTo(point.x, center.y);
  circleCtx.stroke();

  circleCtx.fillStyle = "#ef476f";
  circleCtx.beginPath();
  circleCtx.arc(point.x, point.y, 8, 0, Math.PI * 2);
  circleCtx.fill();

  circleCtx.strokeStyle = "rgba(239, 71, 111, 0.4)";
  circleCtx.lineWidth = 6;
  circleCtx.beginPath();
  circleCtx.arc(center.x, center.y, 54, 0, -angleRad, angleRad > 0);
  circleCtx.stroke();

  circleCtx.fillStyle = "#13262f";
  circleCtx.font = '15px "IBM Plex Mono"';
  circleCtx.fillText("(1, 0)", center.x + radius - 12, center.y + 24);
  circleCtx.fillText("(-1, 0)", center.x - radius - 54, center.y + 24);
  circleCtx.fillText("(0, 1)", center.x - 18, center.y - radius - 16);
  circleCtx.fillText("(0, -1)", center.x - 24, center.y + radius + 28);
  circleCtx.fillText(`(${formatValue(cosine)}, ${formatValue(sine)})`, point.x + 14, point.y - 12);
}

function drawTriangle(sine, cosine, tangent, angleDeg) {
  const { width, height } = elements.triangleCanvas;
  triangleCtx.clearRect(0, 0, width, height);

  const origin = { x: 74, y: height - 70 };
  const scale = 240;
  const base = Math.max(Math.abs(cosine) * scale, 14);
  const rise = Math.max(Math.abs(sine) * scale, 14);
  const directionX = cosine >= 0 ? 1 : -1;
  const directionY = sine >= 0 ? -1 : 1;
  const basePoint = { x: origin.x + base * directionX, y: origin.y };
  const topPoint = { x: basePoint.x, y: origin.y + rise * directionY };

  triangleCtx.strokeStyle = "rgba(19, 38, 47, 0.18)";
  triangleCtx.lineWidth = 1;
  triangleCtx.beginPath();
  triangleCtx.moveTo(origin.x, 40);
  triangleCtx.lineTo(origin.x, height - 40);
  triangleCtx.lineTo(width - 40, height - 40);
  triangleCtx.stroke();

  triangleCtx.strokeStyle = "#13262f";
  triangleCtx.lineWidth = 4;
  triangleCtx.beginPath();
  triangleCtx.moveTo(origin.x, origin.y);
  triangleCtx.lineTo(basePoint.x, basePoint.y);
  triangleCtx.lineTo(topPoint.x, topPoint.y);
  triangleCtx.closePath();
  triangleCtx.stroke();

  triangleCtx.strokeStyle = "#ef476f";
  triangleCtx.beginPath();
  triangleCtx.moveTo(origin.x, origin.y);
  triangleCtx.lineTo(topPoint.x, topPoint.y);
  triangleCtx.stroke();

  triangleCtx.fillStyle = "rgba(17, 138, 178, 0.08)";
  triangleCtx.fillRect(
    Math.min(origin.x, basePoint.x),
    Math.min(origin.y, topPoint.y),
    Math.abs(basePoint.x - origin.x),
    Math.abs(topPoint.y - origin.y)
  );

  triangleCtx.strokeStyle = "#118ab2";
  triangleCtx.strokeRect(
    Math.min(origin.x, basePoint.x) - 1,
    Math.min(origin.y, topPoint.y) - 1,
    16,
    16
  );

  triangleCtx.fillStyle = "#13262f";
  triangleCtx.font = '16px "IBM Plex Mono"';
  triangleCtx.fillText(`adjacent = ${formatValue(cosine)}`, (origin.x + basePoint.x) / 2 - 54, origin.y + 28);
  triangleCtx.fillText(`opposite = ${formatValue(sine)}`, basePoint.x + 12, (origin.y + topPoint.y) / 2);
  triangleCtx.fillText("hypotenuse = 1", (origin.x + topPoint.x) / 2 - 38, (origin.y + topPoint.y) / 2 - 18);
  triangleCtx.fillText(`tan(θ) = ${formatValue(tangent)}`, 42, 42);
  triangleCtx.fillText(`θ = ${angleDeg.toFixed(1)}°`, origin.x + 22, origin.y - 14);
}

function graphPoint(degrees, value, graph) {
  const left = 52;
  const top = 28;
  const width = graph.width - 96;
  const height = graph.height - 72;
  return {
    x: left + (degrees / 360) * width,
    y: top + height / 2 - value * (height / 2),
  };
}

function drawGraph(angleDeg, sine, cosine) {
  const { width, height } = elements.graphCanvas;
  graphCtx.clearRect(0, 0, width, height);

  graphCtx.strokeStyle = "rgba(19, 38, 47, 0.14)";
  graphCtx.lineWidth = 1;
  for (let d = 0; d <= 360; d += 45) {
    const point = graphPoint(d, 0, elements.graphCanvas);
    graphCtx.beginPath();
    graphCtx.moveTo(point.x, 28);
    graphCtx.lineTo(point.x, height - 44);
    graphCtx.stroke();
  }

  for (let y = -1; y <= 1; y += 0.5) {
    const point = graphPoint(0, y, elements.graphCanvas);
    graphCtx.beginPath();
    graphCtx.moveTo(52, point.y);
    graphCtx.lineTo(width - 44, point.y);
    graphCtx.stroke();
  }

  graphCtx.strokeStyle = "#13262f";
  graphCtx.lineWidth = 2;
  graphCtx.beginPath();
  graphCtx.moveTo(52, graphPoint(0, 0, elements.graphCanvas).y);
  graphCtx.lineTo(width - 44, graphPoint(360, 0, elements.graphCanvas).y);
  graphCtx.stroke();

  if (elements.showSine.checked) {
    graphCtx.strokeStyle = "#ef476f";
    graphCtx.lineWidth = 4;
    graphCtx.beginPath();
    for (let d = 0; d <= 360; d += 2) {
      const point = graphPoint(d, Math.sin(toRadians(d)), elements.graphCanvas);
      if (d === 0) graphCtx.moveTo(point.x, point.y);
      else graphCtx.lineTo(point.x, point.y);
    }
    graphCtx.stroke();
  }

  if (elements.showCosine.checked) {
    graphCtx.strokeStyle = "#118ab2";
    graphCtx.lineWidth = 4;
    graphCtx.beginPath();
    for (let d = 0; d <= 360; d += 2) {
      const point = graphPoint(d, Math.cos(toRadians(d)), elements.graphCanvas);
      if (d === 0) graphCtx.moveTo(point.x, point.y);
      else graphCtx.lineTo(point.x, point.y);
    }
    graphCtx.stroke();
  }

  if (elements.showTangent.checked) {
    graphCtx.strokeStyle = "#06d6a0";
    graphCtx.lineWidth = 2;
    graphCtx.beginPath();
    let started = false;
    for (let d = 0; d <= 360; d += 1) {
      const tangent = Math.tan(toRadians(d));
      if (Math.abs(tangent) > 3) {
        started = false;
        continue;
      }
      const point = graphPoint(d, tangent / 3, elements.graphCanvas);
      if (!started) {
        graphCtx.moveTo(point.x, point.y);
        started = true;
      } else {
        graphCtx.lineTo(point.x, point.y);
      }
    }
    graphCtx.stroke();
  }

  const sinePoint = graphPoint(angleDeg, sine, elements.graphCanvas);
  const cosinePoint = graphPoint(angleDeg, cosine, elements.graphCanvas);
  const markerX = graphPoint(angleDeg, 0, elements.graphCanvas).x;

  graphCtx.strokeStyle = "rgba(19, 38, 47, 0.35)";
  graphCtx.lineWidth = 2;
  graphCtx.beginPath();
  graphCtx.moveTo(markerX, 28);
  graphCtx.lineTo(markerX, height - 44);
  graphCtx.stroke();

  if (elements.showSine.checked) {
    graphCtx.fillStyle = "#ef476f";
    graphCtx.beginPath();
    graphCtx.arc(sinePoint.x, sinePoint.y, 6, 0, Math.PI * 2);
    graphCtx.fill();
  }

  if (elements.showCosine.checked) {
    graphCtx.fillStyle = "#118ab2";
    graphCtx.beginPath();
    graphCtx.arc(cosinePoint.x, cosinePoint.y, 6, 0, Math.PI * 2);
    graphCtx.fill();
  }

  graphCtx.fillStyle = "#13262f";
  graphCtx.font = '15px "IBM Plex Mono"';
  for (let d = 0; d <= 360; d += 45) {
    const point = graphPoint(d, 0, elements.graphCanvas);
    graphCtx.fillText(`${d}°`, point.x - 12, height - 18);
  }
  graphCtx.fillText("1", 24, graphPoint(0, 1, elements.graphCanvas).y + 6);
  graphCtx.fillText("0", 24, graphPoint(0, 0, elements.graphCanvas).y + 6);
  graphCtx.fillText("-1", 16, graphPoint(0, -1, elements.graphCanvas).y + 6);
}

function render() {
  const angleRad = toRadians(state.angleDeg);
  const sine = Math.sin(angleRad);
  const cosine = Math.cos(angleRad);
  const tangent = Math.abs(cosine) < 0.00001 ? Number.POSITIVE_INFINITY : sine / cosine;

  elements.angleDegrees.innerHTML = `${state.angleDeg.toFixed(1)}&deg;`;
  elements.angleRadians.textContent = angleRad.toFixed(3);
  elements.quadrantLabel.textContent = quadrantFromAngle(state.angleDeg);
  elements.sineValue.textContent = formatValue(sine);
  elements.cosineValue.textContent = formatValue(cosine);
  elements.tangentValue.textContent = formatValue(tangent);
  elements.referenceAngle.innerHTML = `${referenceAngleFrom(state.angleDeg).toFixed(1)}&deg;`;

  drawUnitCircle(angleRad, sine, cosine);
  drawTriangle(sine, cosine, tangent, state.angleDeg);
  drawGraph(state.angleDeg, sine, cosine);
}

function angleFromPointer(event) {
  const rect = elements.circleCanvas.getBoundingClientRect();
  const scaleX = elements.circleCanvas.width / rect.width;
  const scaleY = elements.circleCanvas.height / rect.height;
  const x = (event.clientX - rect.left) * scaleX - elements.circleCanvas.width / 2;
  const y = (event.clientY - rect.top) * scaleY - elements.circleCanvas.height / 2;
  return clampAngle(Math.atan2(-y, x) * 180 / Math.PI);
}

elements.angleSlider.addEventListener("input", (event) => {
  updateState(Number(event.target.value));
});

elements.presets.forEach((button) => {
  button.addEventListener("click", () => updateState(Number(button.dataset.angle)));
});

[
  elements.showSine,
  elements.showCosine,
  elements.showTangent,
  elements.snapAngles,
].forEach((input) => {
  input.addEventListener("change", () => render());
});

elements.circleCanvas.addEventListener("pointerdown", (event) => {
  state.draggingCircle = true;
  elements.circleCanvas.setPointerCapture(event.pointerId);
  updateState(angleFromPointer(event));
});

elements.circleCanvas.addEventListener("pointermove", (event) => {
  if (!state.draggingCircle) return;
  updateState(angleFromPointer(event));
});

elements.circleCanvas.addEventListener("pointerup", () => {
  state.draggingCircle = false;
});

elements.circleCanvas.addEventListener("pointerleave", () => {
  state.draggingCircle = false;
});

render();
