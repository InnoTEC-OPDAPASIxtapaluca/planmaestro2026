// ============================
// CONFIGURACIÓN MAPA
// ============================
const map = L.map("map", { zoomControl: false }).setView([19.32, -98.93], 13);
L.control.zoom({ position: "bottomright" }).addTo(map);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap"
}).addTo(map);

// ============================
// ICONO PUNTOS
// ============================
const iconoPunto = L.icon({
  iconUrl: "./imagenes/iconopozos.png",
  iconSize: [34, 34],
  iconAnchor: [17, 34],
  popupAnchor: [0, -28]
});

// ============================
// CONTENEDORES GLOBALES
// ============================
const lista = document.getElementById("lista");
const capas = {};           // Apartado -> Bloque -> LayerGroup
const capasGlobales = [];   // Todos los layers individuales
const controlesApartados = {}; // Botones de cada apartado

// ============================
// TOGGLE PANEL
// ============================
window.togglePanel = function () {
  const panel = document.getElementById("panel");
  const btn = document.querySelector(".btn-panel");

  const oculto = panel.classList.toggle("oculto");
  btn.style.left = oculto ? "0px" : "320px";
};

// ============================
// PARSER WKT
// ============================
function parseWKT(wkt) {
  if (!wkt) return null;

  if (wkt.startsWith("POINT")) {
    const [lng, lat] = wkt.replace("POINT (", "").replace(")", "").split(" ").map(Number);
    return { type: "POINT", coords: [lat, lng] };
  }

  if (wkt.startsWith("LINESTRING")) {
    const coords = wkt
      .replace("LINESTRING (", "")
      .replace(")", "")
      .split(",")
      .map(p => {
        const [lng, lat] = p.trim().split(" ").map(Number);
        return [lat, lng];
      });
    return { type: "LINESTRING", coords };
  }

  if (wkt.startsWith("POLYGON")) {
    const coords = wkt
      .replace("POLYGON ((", "")
      .replace("))", "")
      .split(",")
      .map(p => {
        const [lng, lat] = p.trim().split(" ").map(Number);
        return [lat, lng];
      });
    return { type: "POLYGON", coords };
  }

  return null;
}

// ============================
// CARGA CSV
// ============================
Papa.parse("datos.csv", {
  download: true,
  header: true,
  skipEmptyLines: true,
  complete: function (results) {
    results.data.forEach(row => {
      const wkt = row.WKT?.trim();
      const apartado = row.Apartado?.trim() || "Otros";
      const bloque = row.Bloque?.trim() || "Sin bloque";

      if (!wkt) return;
      const geom = parseWKT(wkt);
      if (!geom) return;

      if (!capas[apartado]) capas[apartado] = {};
      if (!capas[apartado][bloque]) capas[apartado][bloque] = L.layerGroup().addTo(map);

      let layer;
      if (geom.type === "POINT") {
        layer = L.marker(geom.coords, { icon: iconoPunto })
          .bindPopup(`<b>${row.Nombre || ""}</b><br>${row.Descripción || ""}`);
      }

      if (geom.type === "LINESTRING") {
        layer = L.polyline(geom.coords, { color: "#1f21b4ff", weight: 4 })
          .bindPopup(`<b>${row.Nombre || ""}</b>`);
      }

      if (geom.type === "POLYGON") {
        layer = L.polygon(geom.coords, {
          color: "#ff9900",      // borde
          fillColor: "#ffcc66",  // relleno
          fillOpacity: 0.5,
          weight: 2
        }).bindPopup(`<b>${row.Nombre || ""}</b><br>${row.Descripción || ""}`);
      }

      if (layer) {
        layer.addTo(capas[apartado][bloque]);
        capasGlobales.push(layer);
      }
    });

    construirLista();
    zoomAutomatico();
  }
});

// ============================
// CONSTRUIR LISTA CON APARTADOS Y BLOQUES
// ============================
function construirLista() {
  lista.innerHTML = "";

  // Botón general arriba
  const btnGeneral = document.createElement("button");
  btnGeneral.textContent = "Apagar todo el mapa";
  btnGeneral.style.margin = "10px";
  btnGeneral.style.cursor = "pointer";
  lista.appendChild(btnGeneral);

  btnGeneral.addEventListener("click", () => {
    const apagar = btnGeneral.textContent === "Apagar todo el mapa";

    Object.keys(capas).forEach(apartado => {
      Object.keys(capas[apartado]).forEach(bloque => {
        const grupo = capas[apartado][bloque];
        const divItem = Array.from(lista.querySelectorAll(".item")).find(
          d => d.querySelector("span").textContent === bloque
        );
        const chk = divItem.querySelector("input");

        if (apagar) {
          map.removeLayer(grupo);
          chk.checked = false;
        } else {
          grupo.addTo(map);
          chk.checked = true;
        }
      });

      const btnApartado = controlesApartados[apartado];
      if (btnApartado) btnApartado.textContent = apagar ? "Encender todo" : "Apagar todo";
    });

    btnGeneral.textContent = apagar ? "Encender todo el mapa" : "Apagar todo el mapa";
  });

  // Crear los apartados
  Object.keys(capas).forEach(apartado => {
    const divApartado = document.createElement("div");
    divApartado.className = "bloque";

    const hApartado = document.createElement("h4");
    hApartado.textContent = apartado;
    hApartado.style.color = "#4B0082"; // Color de texto del apartado
    divApartado.appendChild(hApartado);

    // Botón apagar/encender todo del apartado
    const btnApartado = document.createElement("button");
    btnApartado.textContent = "Apagar todo";
    btnApartado.style.margin = "5px";
    btnApartado.style.cursor = "pointer";
    divApartado.appendChild(btnApartado);

    controlesApartados[apartado] = btnApartado;

    btnApartado.addEventListener("click", () => {
      const apagar = btnApartado.textContent === "Apagar todo";
      Object.keys(capas[apartado]).forEach(bloque => {
        const grupo = capas[apartado][bloque];
        const divItem = Array.from(divApartado.querySelectorAll(".item")).find(
          d => d.querySelector("span").textContent === bloque
        );
        const chk = divItem.querySelector("input");

        if (apagar) {
          map.removeLayer(grupo);
          chk.checked = false;
        } else {
          grupo.addTo(map);
          chk.checked = true;
        }
      });
      btnApartado.textContent = apagar ? "Encender todo" : "Apagar todo";
    });

    // Bloques individuales
    Object.keys(capas[apartado]).forEach(bloque => {
      const divBloque = document.createElement("div");
      divBloque.className = "item";

      const chk = document.createElement("input");
      chk.type = "checkbox";
      chk.checked = true;
      chk.addEventListener("change", () => {
        const grupo = capas[apartado][bloque];
        chk.checked ? grupo.addTo(map) : map.removeLayer(grupo);
      });

      const label = document.createElement("span");
      label.textContent = bloque;
      label.style.cursor = "pointer";
      label.style.fontWeight = "bold";
      label.style.color = "#1f21b4"; // Color de los bloques (azul)

      label.addEventListener("click", () => {
        const grupo = capas[apartado][bloque];
        const features = [];
        grupo.eachLayer(layer => features.push(layer));
        if (!features.length) return;
        const fg = L.featureGroup(features);
        const bounds = fg.getBounds();
        if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
      });

      divBloque.appendChild(chk);
      divBloque.appendChild(label);
      divApartado.appendChild(divBloque);
    });

    lista.appendChild(divApartado);
  });
}

// ============================
// ZOOM AUTOMÁTICO AL CARGAR
// ============================
function zoomAutomatico() {
  if (!capasGlobales.length) return;
  const grupo = L.featureGroup(capasGlobales);
  map.fitBounds(grupo.getBounds(), { padding: [30, 30] });
}
// ============================
// 🟦 Polígono del municipio de Ixtapaluca
// ============================

fetch('./data/poligono_ixtapaluca.json')
  .then(res => res.json())
  .then(geojson => {

    const poligonoIxtapaluca = L.geoJSON(geojson, {
      style: {
        color: '#9D2449',      // borde
        weight: 3,
        fillColor: '#9D2449', // relleno
        fillOpacity: 0.18
      }
    }).addTo(map);

    // Enviar el polígono al fondo
    poligonoIxtapaluca.bringToBack();

    // Ajustar vista al polígono
    map.fitBounds(poligonoIxtapaluca.getBounds());
  })
  .catch(err => console.error('Error cargando poligono_ixtapaluca.geojson:', err));
