bus_datos = {};
let asientosDisponibles = [];
idBus = "";

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

$(document).ready(function () {
  $("#atras").on("click", function () {
    window.location.href = "../index.html";
  });
  const rawData = sessionStorage.getItem("boleto_data");
  const asientoSelect = document.getElementById("asientoSelect");

  if (rawData) {
    try {
      const boleto = JSON.parse(rawData);
      idBus = boleto.id_bus;
      const horaViaje = `${boleto.hora_viaje.slice(0, 5) + " hrs"}`;

      $("#rut").text(boleto.rut);
      $("#id_bus").text(boleto.id_bus);
      $("#estado_boleto").text(boleto.estado_boleto);
      $("#fecha_viaje").text(boleto.fecha_viaje);
      $("#hora_viaje").text(horaViaje);
      $("#boletoResumen").removeClass("d-none");

      if (!idBus) {
        asientoSelect.innerHTML =
          '<option value="">Error: ID de bus no encontrado</option>';
        return;
      }
      loadBusData(idBus);
    } catch (err) {
      console.error("Error al parsear boleto_data:", err);
      $("#errorMsg")
        .removeClass("d-none")
        .text("Error al leer los datos del boleto.");
    }
  } else {
    $("#errorMsg").removeClass("d-none");
  }

  function loadBusData(busId) {
    const url = `https://gds.kupos.com/gds/api/ui_schedule/${busId}.json?api_key=TSSDFPAPI30103014`;

    axios
      .get(url)
      .then((response) => {
        const availableString = response.data.result.bus_layout.available
        let availableArray = availableString.split(",");
        if (availableArray[0] === "") {
          availableArray.shift()
        }

        console.log("bus_data: ", response.data);

        // availableArray = []; // simular servicio sin asientos

        if (!availableArray.length || !availableArray[0]) {
          Toast.fire({
            icon: "info",
            title:
              "No hay asientos disponibles en el bus, buscando alternativas...",
            timer: 5000,
          });
          console.warn(
            `No hay asientos en el bus ${busId}, buscando alternativas...`
          );
          return getServices(response.data.result);
        }
        setupBusData(response.data.result, availableArray, busId);
      })
      .catch((error) => {
        console.error("Error al cargar el bus:", error);
        asientoSelect.innerHTML =
          '<option value="">Error al cargar los asientos</option>';
      });
  }

  function setupBusData(result, availableArray, busIdUsado) {
    bus_datos = result;
    idBus = busIdUsado;
    boarding_at = result.boarding_stage_coordinates.split("|")[0];

    // mensaje de prueba
    // $("#mensajeBus")
    //   .text(
    //     `Atención: Su bus tiene fecha ${bus_datos.travel_date} a las ${bus_datos.dep_time} hrs `
    //   )
    //   .removeClass("d-none");

    const seats = availableArray
      .map((item) => {
        const [num, price] = item.split("|");
        return {
          num: (num || "").trim(),
          price: (price || "0").trim(),
        };
      })
      .filter((seat) => seat.num !== "");

    asientosDisponibles = seats;

    asientoSelect.innerHTML = '<option value="">Seleccione un asiento</option>';
    seats
      .sort((a, b) => a.num - b.num)
      .forEach((seat) => {
        const option = document.createElement("option");
        option.value = seat.num;
        option.textContent = `Asiento ${seat.num}`;
        asientoSelect.appendChild(option);
      });
  }

  function getServices(refData) {
    const idOrigen = refData.origin_id;
    const idDestino = refData.destination_id;
    const fechaViaje = refData.travel_date;
    const horaViaje = refData.dep_time;

    if (!idOrigen || !idDestino || !fechaViaje) {
      Toast.fire({
        icon: "error",
        title: "Faltan datos para obtener servicios",
      });
      console.error("Faltan datos para obtener servicios");
      return;
    }

    const url = `https://gds.kupos.com/gds/api/ui_schedules/${idOrigen}/${idDestino}/${fechaViaje}.json?api_key=TSSDFPAPI30103014`;

    axios
      .get(url)
      .then((res) => {
        const result = res.data.result;
        result.shift();
        const toMinutes = (hora) => {
          const [h, m] = hora.split(":").map(Number);
          return h * 60 + m;
        };
        const minutosViaje = toMinutes(horaViaje);
        const serviciosInfo = result.map((servicio) => {
          const idServicio = servicio[0];
          const horaServicio = servicio[9];
          return {
            id: idServicio,
            hora: horaServicio,
            minutos: toMinutes(horaServicio),
            servicioData: servicio,
          };
        });

        const serviciosPosteriores = serviciosInfo
          .filter((servicio) => {
            if (!servicio.id || !servicio.hora) return false;
            return servicio.minutos > minutosViaje;
          })
          .sort((a, b) => a.minutos - b.minutos);

        console.log("Servicios posteriores ordenados:", serviciosPosteriores);

        const idsOrdenados = serviciosPosteriores.map((serv) => serv.id);

        tryNextBus(idsOrdenados);
      })
      .catch((error) => {
        console.error("Error al obtener servicios:", error);
      });
  }

  function tryNextBus(busIds, currentIndex = 0) {
    if (currentIndex >= busIds.length) {
      asientoSelect.innerHTML =
        '<option value="">No se encontraron buses con asientos</option>';
      Toast.fire({
        icon: "error",
        title: "No se encontraron buses con asientos",
      });
      return;
    }

    const nextBusId = busIds[currentIndex];
    console.log(
      `Probando bus ${currentIndex + 1}/${busIds.length}: ${nextBusId}`
    );

    const url = `https://gds.kupos.com/gds/api/ui_schedule/${nextBusId}.json?api_key=TSSDFPAPI30103014`;

    axios
      .get(url)
      .then((response) => {
        const availableString = response.data.result.bus_layout.available
        const availableArray = availableString.split(",");
        if (availableArray[0] === "") {
          availableArray.shift()
        }
        if (availableArray.length && availableArray[0]) {
          setupBusData(response.data.result, availableArray, nextBusId);
          const fecha = response.data.result.travel_date;
          const hora = response.data.result.dep_time;
          Toast.fire({
            icon: "success",
            title: `¡Bus con asientos disponibles!`,
          });
          $("#mensajeBus")
            .text(`Atención: Su bus tiene fecha ${fecha} a las ${hora} hrs `)
            .removeClass("d-none");
          console.log(`Servicio ${nextBusId} con asientos disponibles`);
          return;
        } else {
          console.log(
            `Bus ${nextBusId} sin asientos, probando siguiente...`
          );

          tryNextBus(busIds, currentIndex + 1);
        }
      })
      .catch((error) => {
        console.error(`Error con bus ${nextBusId}:`, error);
        Toast.fire({
          icon: "error",
          title: `Error con bus, intentando siguiente...`,
          timer: 2000,
        });
        tryNextBus(busIds, currentIndex + 1);
      });
  }

  // Evento cambio de asiento
  asientoSelect.addEventListener("change", function () {
    const asiento = asientoSelect.value;
    const asientoSeleccionado = asientosDisponibles.find(
      (s) => s.num === asiento
    );
    document.getElementById("asientoSeleccionado").textContent = asiento
      ? `Asiento ${asiento}`
      : "";

    const payload = {
      book_ticket: {
        seat_details: {
          seat_detail: [
            {
              seat_number: asientoSeleccionado.num,
              fare: asientoSeleccionado.price,
              title: "Mr",
              name: "Dorian gonzalez",
              age: "55",
              sex: "M",
              is_primary: "true",
              id_card_type: "1",
              id_card_number: "10520823k",
              id_card_issued_by: "oneone",
            },
          ],
        },
        contact_detail: {
          mobile_number: "942858102",
          emergency_name: "Dorian Gonzalez",
          email: "dgonzalez@wit.la",
        },
      },
      origin_id: bus_datos.origin_id,
      destination_id: bus_datos.destination_id,
      boarding_at: boarding_at,
      no_of_seats: "1",
      travel_date: bus_datos.travel_date,
      available_seats: bus_datos.available_seats,
      cost: bus_datos.cost,
      bus_type: bus_datos.bus_type,
      route_id: bus_datos.route_id,
    };

    console.log("Payload de reserva:", payload);

    const reservaUrl = `https://gds.kupos.com/gds/api/tentative_booking/${idBus}.json?api_key=TSSDFPAPI30103014&region=chile`;
    const confirmUrlBase = `https://gds.kupos.com/gds/api/confirm_booking`;

    asientoSelect.disabled = true;
    $("#atras").prop("disabled", true);

    $("#loaderReserva").removeClass("d-none");
    $("#loaderConfirmacion").addClass("d-none");
    $("#boletoConfirmado").addClass("d-none");

    axios
      .post(reservaUrl, payload)
      .then((response) => {
        $("#loaderReserva").addClass("d-none");
        $("#loaderConfirmacion").removeClass("d-none");

        const reserva = response.data.result.ticket_details.pnr_number;
        console.log("Reserva temporal:", reserva);

        return axios.post(
          `${confirmUrlBase}/${reserva}.json?api_key=TSSDFPAPI30103014&region=chile`
        );
      })
      .then((confirmResponse) => {
        $("#loaderConfirmacion").addClass("d-none");

        const ticket = confirmResponse.data.result.ticket_details;
        console.log("hora viaje: ", ticket);
        $("#operator_pnr").text(ticket.operator_pnr);
        $("#ticket_number").text(ticket.ticket_number);
        $("#origen").text(ticket.origin);
        $("#destino").text(ticket.destination);
        $("#fecha_confirmada").text(ticket.travel_date);
        $("#asientos_confirmados").text(ticket.seat_numbers);

        let hora12 = ticket.dep_time.trim();
        function convertir12a24(hora12) {
          let [time, modifier] = hora12.split(" ");
          let [hours, minutes] = time.split(":").map(Number);
          if (modifier.toLowerCase() === "pm" && hours !== 12) {
            hours += 12;
          }
          if (modifier.toLowerCase() === "am" && hours === 12) {
            hours = 0;
          }
          let hours24 = hours < 10 ? "0" + hours : hours;
          return `${hours24}:${minutes < 10 ? "0" + minutes : minutes} hrs`;
        }
        const hora24 = convertir12a24(hora12);

        $("#hora_salida").text(hora24);
        $("#tipo_bus").text(ticket.bus_type);
        $("#boletoConfirmado").removeClass("d-none");
        $("#asientos").addClass("d-none");

        asientoSelect.disabled = false;
        $("#atras").prop("disabled", false);

        const sessionData =
          JSON.parse(sessionStorage.getItem("boleto_data")) || {};

        const bookingData = {
          ...sessionData,
          numero_boleto: ticket.operator_pnr,
          estado_boleto: "Confirmado",
          origen: ticket.origin,
          destino: ticket.destination,
          fecha_viaje: ticket.travel_date,
          hora_viaje: ticket.dep_time,
          asiento: sessionData.asiento,
          total_transaccion: sessionData.total_transaccion,
          fecha_transaccion: sessionData.fecha_transaccion,
          hora_transaccion: sessionData.hora_transaccion,
          codigo_reserva: ticket.ticket_number,
          codigo_transaccion: sessionData.codigo_transaccion,
          codigo_autorizacion: sessionData.codigo_autorizacion,
          id_pos: sessionData.id_pos,
          id_bus: sessionData.id_bus,
          tipo_tarjeta: sessionData.tipo_tarjeta,
          tarjeta_marca: sessionData.tarjeta_marca,
          estado_transaccion: "Generado Manualmente",
          rut: sessionData.rut || "Sin RUT",
          numTotem: sessionData.numTotem,
        };

        console.log("Datos del boleto:", bookingData);

        const bookingDataUpdate = {
          id: sessionData.id,
          nuevo_estado: "Pago Intercambio",
        };

        console.log("Datos de actualización:", bookingDataUpdate);

        // Guardado en base de datos
        axios.post(
          "https://log-totem.dev-wit.com/backend-log-totem-transbank/api.php",
          { bookingData }
        );
        // Actualización en la base de datos
        axios.post(
          "https://log-totem.dev-wit.com/boletos/api/update.php",
          bookingDataUpdate
        );
      })
      .then(() => {
        console.log("Guardado exitoso en DB (confirm booking)");
      })
      .catch((error) => {
        $("#loaderReserva").addClass("d-none");
        $("#loaderConfirmacion").addClass("d-none");
        asientoSelect.disabled = false;
        $("#atras").prop("disabled", false);
        console.error(
          "Error durante la reserva, confirmación o guardado:",
          error
        );
        Toast.fire({
          icon: "error",
          title: "Ocurrió un error al procesar el boleto",
        });
      });
  });
});
