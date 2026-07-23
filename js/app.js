/**
 * =====================================================
 * PORTAL DE VINCULACIÓN TRVELY
 * app.js v2.0
 * Comportamientos de interfaz que no dependen de Supabase.
 * El envío del formulario ahora vive en formulario.js
 * =====================================================
 */

document.querySelectorAll(".file-group input[type='file']").forEach(function (input) {
    input.addEventListener("change", function () {
        const boton = document.getElementById("label_" + input.id);
        if (!boton) return;

        if (input.files && input.files.length > 0) {
            boton.innerHTML = '<span class="icono">✓</span> ' + input.files[0].name;
            boton.classList.add("tiene-archivo");
        } else {
            boton.innerHTML = '<span class="icono">⬆</span> Adjuntar archivo aquí';
            boton.classList.remove("tiene-archivo");
        }
    });
});
