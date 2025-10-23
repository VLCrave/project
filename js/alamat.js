let map, customerMarker;
if (typeof customerLocation === 'undefined') {
  var customerLocation = { lat: -1.6409437, lng: 105.7686011 };
}
let alamatCadanganTerpilih = "";

function initMap(lat = customerLocation.lat, lng = customerLocation.lng) {
  if (!document.getElementById("map-container")) {
    console.warn("❌ Map container not found.");
    return;
  }
  if (map) return;

  map = L.map('map-container').setView([lat, lng], 17);
  L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);

  customerMarker = L.marker([lat, lng], { draggable: true })
    .addTo(map)
    .bindPopup("📍 Lokasi Anda")
    .openPopup();

  customerMarker.on('dragend', e => {
    const pos = e.target.getLatLng();
    customerLocation = { lat: pos.lat, lng: pos.lng };
    saveOnlyLocation(pos.lat, pos.lng);
  });
}

function saveAddress() {
  const nama = document.getElementById('full-name').value.trim();
  const noHp = document.getElementById('phone-number').value.trim();
  const alamat = document.getElementById('full-address').value.trim();
  const catatan = document.getElementById('courier-note').value.trim();
  const setPrimary = document.getElementById('set-primary')?.checked ?? true;

  if (!nama || !noHp || !alamat) return alert("❌ Mohon lengkapi semua data alamat.");

  const user = firebase.auth().currentUser;
  if (!user) return;

  const db = firebase.firestore();
  const uid = user.uid;

  const dataAlamat = {
    userId: uid,
    nama,
    noHp,
    alamat,
    catatan,
    lokasi: new firebase.firestore.GeoPoint(customerLocation.lat, customerLocation.lng),
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  const saveUtama = setPrimary
    ? db.collection("alamat").doc(uid).set(dataAlamat)
    : Promise.resolve();

  const saveCadangan = db.collection("alamat").doc(uid).collection("daftar").add(dataAlamat);

  Promise.all([saveUtama, saveCadangan])
    .then(() => {
      alert("✅ Alamat berhasil disimpan.");
      loadSavedAddress();
      loadAlamatCadangan();
    })
    .catch(err => {
      console.error("❌ Gagal menyimpan:", err);
      alert("❌ Gagal menyimpan alamat.");
    });
}

function saveOnlyLocation(lat, lng) {
  const user = firebase.auth().currentUser;
  if (!user) return;

  firebase.firestore().collection("alamat").doc(user.uid).update({
    lokasi: new firebase.firestore.GeoPoint(lat, lng)
  }).then(() => {
    console.log("📍 Lokasi diperbarui.");
  }).catch(err => {
    console.error("❌ Gagal update lokasi:", err);
  });
}

function loadSavedAddress() {
  const user = firebase.auth().currentUser;
  if (!user) return;

  const db = firebase.firestore();
  db.collection("alamat").doc(user.uid).get()
    .then(doc => {
      const box = document.getElementById('address-display');
      const text = document.getElementById('saved-address');
      const note = document.getElementById('saved-note');

      if (doc.exists) {
        const data = doc.data();
        if (box) box.style.display = 'block';
        if (text) text.innerHTML = `👤 ${data.nama}<br/>📱 ${data.noHp}<br/>🏠 ${data.alamat}`;
        if (note) note.textContent = data.catatan || '-';
        const form = document.getElementById('address-form');
        if (form) form.style.display = 'none';

        if (data.lokasi?.latitude !== undefined && data.lokasi?.longitude !== undefined) {
          customerLocation = {
            lat: data.lokasi.latitude,
            lng: data.lokasi.longitude
          };
          if (map && customerMarker) {
            map.setView([customerLocation.lat, customerLocation.lng], 17);
            customerMarker.setLatLng([customerLocation.lat, customerLocation.lng]);
          } else {
            setTimeout(() => initMap(customerLocation.lat, customerLocation.lng), 200);
          }
        } else {
          setTimeout(() => initMap(), 200);
        }
      } else {
        const form = document.getElementById('address-form');
        if (form) form.style.display = 'block';
        if (box) box.style.display = 'none';
        setTimeout(() => initMap(), 200);
      }
    })
    .catch(err => {
      console.error("❌ Gagal memuat alamat:", err);
    });
}

function loadAlamatCadangan() {
  const user = firebase.auth().currentUser;
  if (!user) return;

  const select = document.getElementById('alamatTersimpan');
  if (!select) return;

  select.innerHTML = '<option value="">-- Pilih Alamat Tersimpan --</option>';

  firebase.firestore()
    .collection("alamat")
    .doc(user.uid)
    .collection("daftar")
    .orderBy("createdAt", "desc")
    .get()
    .then(snapshot => {
      if (snapshot.empty) {
        const opt = document.createElement("option");
        opt.disabled = true;
        opt.textContent = "❌ Tidak ada alamat cadangan";
        select.appendChild(opt);
        return;
      }

      snapshot.forEach(doc => {
        const data = doc.data();
        const option = document.createElement("option");
        option.value = doc.id;
        option.textContent = `${data.nama || 'Alamat'} - ${data.alamat?.substring(0, 35) || ''}...`;
        select.appendChild(option);
      });
    });
}

function isiDariAlamatCadangan(docId) {
  if (!docId) return;
  alamatCadanganTerpilih = docId;

  const user = firebase.auth().currentUser;
  if (!user) return;

  firebase.firestore()
    .collection("alamat")
    .doc(user.uid)
    .collection("daftar")
    .doc(docId)
    .get()
    .then(doc => {
      if (!doc.exists) return;
      const data = doc.data();

      document.getElementById('full-name').value = data.nama || '';
      document.getElementById('phone-number').value = data.noHp || '';
      document.getElementById('full-address').value = data.alamat || '';
      document.getElementById('courier-note').value = data.catatan || '';
      document.getElementById('set-primary').checked = true;

      if (data.lokasi?.latitude && data.lokasi?.longitude) {
        customerLocation = {
          lat: data.lokasi.latitude,
          lng: data.lokasi.longitude
        };
        if (map && customerMarker) {
          map.setView([customerLocation.lat, customerLocation.lng], 17);
          customerMarker.setLatLng([customerLocation.lat, customerLocation.lng]);
        }
      }
    });
}

function jadikanUtamaDariCadangan() {
  if (!alamatCadanganTerpilih) return alert("❌ Pilih alamat terlebih dahulu.");

  const user = firebase.auth().currentUser;
  if (!user) return;

  const ref = firebase.firestore()
    .collection("alamat")
    .doc(user.uid)
    .collection("daftar")
    .doc(alamatCadanganTerpilih);

  ref.get().then(doc => {
    if (!doc.exists) return alert("❌ Alamat tidak ditemukan.");
    const data = doc.data();

    firebase.firestore().collection("alamat").doc(user.uid).set(data)
      .then(() => {
        alert("✅ Alamat utama diperbarui.");
        loadSavedAddress();
      });
  });
}

function hapusAlamatCadangan() {
  if (!alamatCadanganTerpilih) return alert("❌ Pilih alamat terlebih dahulu.");

  const user = firebase.auth().currentUser;
  if (!user) return;

  if (confirm("Yakin ingin menghapus alamat ini?")) {
    firebase.firestore()
      .collection("alamat")
      .doc(user.uid)
      .collection("daftar")
      .doc(alamatCadanganTerpilih)
      .delete()
      .then(() => {
        alert("✅ Alamat cadangan dihapus.");
        alamatCadanganTerpilih = "";
        document.getElementById("alamatTersimpan").value = "";
        loadAlamatCadangan();
      });
  }
}
