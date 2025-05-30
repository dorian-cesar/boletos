sessionStorage.clear();

const Toast = Swal.mixin({
  toast: true,
  position: "center",
  iconColor: "white",
  customClass: {
    popup: "colored-toast",
  },
  showConfirmButton: false,
  timer: 2000,
  timerProgressBar: true,
});

$("#consulta-form").on("submit", function (e) {
  e.preventDefault();

  const rut = $("#rut").val().trim();
  const codigoAutorizacion = $("#codigo_autorizacion").val().trim();
  let url = "https://log-totem.dev-wit.com/boletos/api/registros.php?";

  if (rut) url += "rut=" + encodeURIComponent(rut) + "&";
  if (codigoAutorizacion)
    url += "codigo_autorizacion=" + encodeURIComponent(codigoAutorizacion);

  if (!rut && !codigoAutorizacion) {
    Toast.fire({
      icon: "info",
      title: "Debe ingresar un RUT o un Código de Autorización",
    });
    return;
  }

  $.getJSON(url, function (data) {
    data = data.filter((row) => row.numTotem !== "192.168.88.254");
    $(document)
      .off("click", ".generar-boleto")
      .on("click", ".generar-boleto", function () {
        const id = $(this).data("id");
        const registro = data.find((r) => r.id == id);
        if (registro) {
          sessionStorage.setItem("boleto_data", JSON.stringify(registro));
          window.location.href = "./views/generar_boleto.html";
        } else {
          Toast.fire({
            icon: "error",
            title: "No se encontró el registro",
          });
        }
      });

    let cards = "";
    if (data.length === 0) {
      Toast.fire({
        icon: "error",
        title: "No se encontraron registros",
      });
    } else {
      data.forEach((row) => {
        let iconoEstado = "";
        const estado = row.estado_transaccion?.toLowerCase() || "";

        if (estado.includes("realizado")) {
          iconoEstado = '<span class="text-success fw-bold">✅</span>';
        } else if (estado.includes("fallido") || estado.includes("pendiente")) {
          iconoEstado = '<span class="text-danger fw-bold">❌</span>';
        }

        // Fecha y hora del viaje en objeto Date
        const viajeDateTime = new Date(`${row.fecha_viaje}T${row.hora_viaje}`);
        const ahora = new Date();
        const fechaVencida = viajeDateTime <= ahora;

        const mostrarBotonGenerar =
          estado.includes("pago realizado") &&
          (!row.numero_boleto || row.numero_boleto === "null");

        cards += `
    <div class="card mb-3 shadow-sm">
      <div class="card-body">
        <h6 class="card-title mb-1"><strong>Boleto:</strong> ${
          row.numero_boleto || "—"
        }</h6>
        <h6 class="card-title mb-1"><strong>Reserva:</strong> ${
          row.codigo_reserva
        }</h6>
        <p class="card-text mb-1"><strong>ID:</strong> ${row.id}</p>
        <p class="card-text mb-1"><strong>RUT:</strong> ${row.rut}</p>
        <p class="card-text mb-1"><strong>Id BUS:</strong> ${row.id_bus}</p>
        <p class="card-text mb-1"><strong>Destino:</strong> ${row.destino}</p>
        <p class="card-text mb-1"><strong>Fecha Viaje:</strong> ${
          row.fecha_viaje
        }</p>
        <p class="card-text mb-1"><strong>Hora Viaje:</strong> ${
          row.hora_viaje.slice(0, 5) || "—"
        } hrs</p>
        <p class="card-text mb-1"><strong>Asiento:</strong> ${row.asiento}</p>
        <p class="card-text mb-1"><strong>Estado Pago:</strong> ${
          row.estado_transaccion
        } ${iconoEstado}</p>
         <p class="card-text mb-1"><strong>Estado Boleto:</strong> ${
           row.estado_boleto
         }</p>
        <p class="card-text mb-1"><strong>Terminal:</strong> ${row.id_pos}</p>
        <p class="card-text mb-1"><strong>Total Transacción:</strong> ${
          row.total_transaccion
        }</p>
        <p class="card-text mb-1"><strong>Código Transacción:</strong> ${
          row.codigo_transaccion || "—"
        }</p>
        <p class="card-text mb-1"><strong>Código Autorización:</strong> ${
          row.codigo_autorizacion || "—"
        }</p>
        ${
          mostrarBotonGenerar
            ? `
          <div class="mt-3">
            <button
              class="btn btn-sm ${
                fechaVencida ? "btn-secondary" : "btn-success"
              } generar-boleto p-2"
                data-id="${row.id}"
                ${fechaVencida ? "disabled" : ""}
                >Generar Boleto</button>
         </div>
          `
            : ""
        }
      </div>
   </div>
  `;
      });
    }
    $("#cards-resultados").html(cards);
  }).fail(function () {
    Toast.fire({
      icon: "error",
      title: "Error al consultar los datos",
    });
  });
});
