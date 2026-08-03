/**
 * =====================================================
 * PORTAL DE VINCULACIÓN TRVELY
 * admin.js
 * Login de administradores + revisión de candidatos y
 * aprobación/rechazo de documentos por documento.
 * =====================================================
 */

const loginSection = document.getElementById("login-section");
const dashboardSection = document.getElementById("dashboard-section");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const logoutBtn = document.getElementById("logout-btn");
const listaCandidatosEl = document.getElementById("lista-candidatos");
const detalleCandidatoEl = document.getElementById("detalle-candidato");
const buscarInput = document.getElementById("buscar-candidato");
const filtroEstadoSelect = document.getElementById("filtro-estado");
const kpiRegistrados = document.getElementById("kpi-registrados");
const kpiRevision = document.getElementById("kpi-revision");
const kpiRechazados = document.getElementById("kpi-rechazados");
const kpiAprobados = document.getElementById("kpi-aprobados");
const kpiContrato = document.getElementById("kpi-contrato");

let candidatoSeleccionadoId = null;
let candidatosCache = [];
let documentosCache = [];

const ETIQUETAS_ESTADO = {
    pendiente: "Pendiente",
    aprobado: "Aprobado",
    rechazado: "Rechazado"
};

const ETIQUETAS_ESTADO_PROCESO = {
    registrado: "Registrado",
    documentos_en_revision: "En revisión",
    documentos_aprobados: "Aprobado",
    documentos_rechazados: "Rechazado",
    contrato_enviado: "Contrato enviado"
};

const CLASES_ESTADO_PROCESO = {
    registrado: "badge-registrado",
    documentos_en_revision: "badge-pendiente",
    documentos_aprobados: "badge-aprobado",
    documentos_rechazados: "badge-rechazado",
    contrato_enviado: "badge-contrato"
};


/*
|--------------------------------------------------------------------------
| SESIÓN
|--------------------------------------------------------------------------
*/

async function verificarSesion() {

    const { data } = await window.supabaseClient.auth.getSession();

    if (data.session) {
        mostrarDashboard();
    } else {
        mostrarLogin();
    }
}

function mostrarLogin() {
    loginSection.style.display = "block";
    dashboardSection.style.display = "none";
}

function mostrarDashboard() {
    loginSection.style.display = "none";
    dashboardSection.style.display = "block";
    cargarCandidatos();
}


loginForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    loginError.style.display = "none";

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    const { error } = await window.supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {
        loginError.textContent = "Correo o contraseña incorrectos.";
        loginError.style.display = "block";
        return;
    }

    mostrarDashboard();
});


logoutBtn.addEventListener("click", async function () {
    await window.supabaseClient.auth.signOut();
    candidatoSeleccionadoId = null;
    mostrarLogin();
});


/*
|--------------------------------------------------------------------------
| CARGAR CANDIDATOS
|--------------------------------------------------------------------------
*/

async function cargarCandidatos() {

    listaCandidatosEl.innerHTML = '<p class="admin-placeholder">Cargando candidatos...</p>';

    const { data: candidatos, error: errorCandidatos } =
        await window.supabaseClient
            .from("candidatos")
            .select("id, nombre_completo, numero_documento, perfil, ciudad_labor, estado_proceso, created_at")
            .order("created_at", { ascending: false });

    if (errorCandidatos) {
        listaCandidatosEl.innerHTML =
            '<p class="admin-placeholder">Error al cargar candidatos.</p>';
        console.error(errorCandidatos);
        return;
    }

    const { data: documentos, error: errorDocumentos } =
        await window.supabaseClient
            .from("documentos")
            .select("id, candidato_id, estado");

    if (errorDocumentos) {
        console.error(errorDocumentos);
    }

    documentosCache = documentos || [];
    candidatosCache = candidatos || [];
    
    actualizarKPIs();
    aplicarFiltros();
}


function aplicarFiltros() {

    const texto = (buscarInput.value || "").trim().toLowerCase();
    const estado = filtroEstadoSelect.value;

    const filtrados = candidatosCache.filter(function (candidato) {

        const coincideTexto =
            texto === "" ||
            (candidato.nombre_completo || "").toLowerCase().includes(texto) ||
            (candidato.numero_documento || "").toLowerCase().includes(texto);

        const coincideEstado =
            estado === "" || candidato.estado_proceso === estado;

        return coincideTexto && coincideEstado;
    });

    renderizarListaCandidatos(filtrados);
}

buscarInput.addEventListener("input", aplicarFiltros);
filtroEstadoSelect.addEventListener("change", aplicarFiltros);


function contarPendientes(candidatoId) {
    return documentosCache.filter(function (d) {
        return d.candidato_id === candidatoId && d.estado === "pendiente";
    }).length;
}
function actualizarKPIs() {

    kpiRegistrados.textContent =
        candidatosCache.filter(function(c){
            return c.estado_proceso === "registrado";
        }).length;

    kpiRevision.textContent =
        candidatosCache.filter(function(c){
            return c.estado_proceso === "documentos_en_revision";
        }).length;

    kpiRechazados.textContent =
        candidatosCache.filter(function(c){
            return c.estado_proceso === "documentos_rechazados";
        }).length;

    kpiAprobados.textContent =
        candidatosCache.filter(function(c){
            return c.estado_proceso === "documentos_aprobados";
        }).length;

    kpiContrato.textContent =
        candidatosCache.filter(function(c){
            return c.estado_proceso === "contrato_enviado";
        }).length;
}

function renderizarListaCandidatos(candidatos) {

    if (candidatosCache.length === 0) {
        listaCandidatosEl.innerHTML =
            '<p class="admin-placeholder">Todavía no hay candidatos registrados.</p>';
        return;
    }

    if (candidatos.length === 0) {
        listaCandidatosEl.innerHTML =
            '<p class="admin-placeholder">Ningún candidato coincide con la búsqueda/filtro.</p>';
        return;
    }

    listaCandidatosEl.innerHTML = "";

    candidatos.forEach(function (candidato) {

        const pendientes = contarPendientes(candidato.id);
        const estadoProceso = candidato.estado_proceso || "registrado";

        const card = document.createElement("div");
        card.className = "candidato-card";
        card.dataset.id = candidato.id;

        if (candidato.id === candidatoSeleccionadoId) {
            card.classList.add("activo");
        }

        card.innerHTML =
            "<h4>" + (candidato.nombre_completo || "Sin nombre") + "</h4>" +
            "<p>" + (candidato.perfil || "") +
            (candidato.ciudad_labor ? " · " + candidato.ciudad_labor : "") +
            (candidato.numero_documento ? " · " + candidato.numero_documento : "") + "</p>" +
            '<span class="badge-estado ' + (CLASES_ESTADO_PROCESO[estadoProceso] || "badge-registrado") + '">' +
                (ETIQUETAS_ESTADO_PROCESO[estadoProceso] || estadoProceso) +
            '</span>' +
            (pendientes > 0
                ? ' <span class="badge-estado badge-pendiente">' + pendientes + ' por revisar</span>'
                : '');

        card.addEventListener("click", function () {
            candidatoSeleccionadoId = candidato.id;

            document
                .querySelectorAll(".candidato-card")
                .forEach(function (c) { c.classList.remove("activo"); });

            card.classList.add("activo");

            mostrarDetalleCandidato(candidato);
        });

        listaCandidatosEl.appendChild(card);
    });
}


/*
|--------------------------------------------------------------------------
| DETALLE DE CANDIDATO + DOCUMENTOS
|--------------------------------------------------------------------------
*/

async function mostrarDetalleCandidato(candidato) {

    detalleCandidatoEl.innerHTML = '<p class="admin-placeholder">Cargando documentos...</p>';

    const { data: documentos, error } =
        await window.supabaseClient
            .from("documentos")
            .select("id, tipo_documento, nombre_archivo, ruta_storage, estado, motivo_rechazo")
            .eq("candidato_id", candidato.id)
            .order("tipo_documento", { ascending: true });

    if (error) {
        detalleCandidatoEl.innerHTML =
            '<p class="admin-placeholder">Error al cargar los documentos.</p>';
        console.error(error);
        return;
    }

    let html =
        "<h3>" + candidato.nombre_completo + "</h3>" +
        "<p style='color:#666;margin-bottom:25px;'>" +
        (candidato.perfil || "") +
        (candidato.ciudad_labor ? " · " + candidato.ciudad_labor : "") +
        "</p>";

    if (!documentos || documentos.length === 0) {
        html += '<p class="admin-placeholder">Este candidato no adjuntó documentos.</p>';
        detalleCandidatoEl.innerHTML = html;
        return;
    }

    documentos.forEach(function (doc) {

        html +=
            '<div class="documento-revision" data-doc-id="' + doc.id + '">' +
                '<div>' +
                    '<span class="nombre-doc">' + doc.tipo_documento + '</span><br>' +
                    '<span class="badge-estado badge-' + doc.estado + '">' +
                        ETIQUETAS_ESTADO[doc.estado] +
                    '</span>' +
                    (doc.estado === "rechazado" && doc.motivo_rechazo
                        ? '<p class="motivo-rechazo">Motivo: ' + doc.motivo_rechazo + '</p>'
                        : '') +
                '</div>' +
                '<div class="acciones">' +
                    '<button class="btn-ver" data-accion="ver" data-ruta="' + doc.ruta_storage + '">Ver</button>' +
                    '<button class="btn-aprobar" data-accion="aprobar" data-id="' + doc.id + '">Aprobar</button>' +
                    '<button class="btn-rechazar" data-accion="rechazar" data-id="' + doc.id + '">Rechazar</button>' +
                '</div>' +
            '</div>';
    });

    detalleCandidatoEl.innerHTML = html;

    detalleCandidatoEl.querySelectorAll("[data-accion]").forEach(function (btn) {

        btn.addEventListener("click", async function () {

            const accion = btn.dataset.accion;

            if (accion === "ver") {
                abrirDocumento(btn.dataset.ruta);
                return;
            }

            if (accion === "rechazar") {

                const motivo = prompt(
                    "¿Por qué se rechaza este documento? (esto se le va a mostrar al asesor)"
                );

                if (motivo === null) {
                    return; // el admin canceló
                }

                if (motivo.trim() === "") {
                    alert("Tenés que escribir un motivo para rechazar el documento.");
                    return;
                }

                await actualizarEstadoDocumento(btn.dataset.id, "rechazado", candidato, motivo.trim());
                return;
            }

            await actualizarEstadoDocumento(btn.dataset.id, "aprobado", candidato, null);
        });
    });
}


async function abrirDocumento(rutaStorage) {

    const { data, error } =
        await window.supabaseClient
            .storage
            .from("documentos")
            .createSignedUrl(rutaStorage, 60 * 5);

    if (error) {
        alert("No se pudo abrir el archivo:\n" + error.message);
        console.error(error);
        return;
    }

    window.open(data.signedUrl, "_blank");
}


async function actualizarEstadoDocumento(documentoId, nuevoEstado, candidato, motivo) {

    const { error } =
        await window.supabaseClient
            .from("documentos")
            .update({
                estado: nuevoEstado,
                motivo_rechazo: nuevoEstado === "rechazado" ? motivo : null
            })
            .eq("id", documentoId);

    if (error) {
        alert("No se pudo actualizar el documento:\n" + error.message);
        console.error(error);
        return;
    }

    // Refrescar detalle y lista para que se actualicen los badges
    await cargarCandidatos();
    mostrarDetalleCandidato(candidato);
}


/*
|--------------------------------------------------------------------------
| INICIO
|--------------------------------------------------------------------------
*/

verificarSesion();
