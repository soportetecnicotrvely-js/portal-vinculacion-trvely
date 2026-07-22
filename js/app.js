/**
 * =====================================================
 * PORTAL DE VINCULACIÓN TRVELY
 * app.js v1.0
 * =====================================================
 */


const formulario = document.getElementById(
    "formulario-candidato"
);


formulario.addEventListener(
    "submit",
    function(event){

        event.preventDefault();


        alert(
            "Formulario preparado correctamente. La conexión con Supabase se realizará en la siguiente etapa."
        );


    }
);
