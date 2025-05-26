<?php
// CORS libre para todos los sitios
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: *");
header("Access-Control-Allow-Methods: POST");
header("Content-Type: application/json");

// Configuración base de datos


$host = 'ls-24ab11e36d4d24df477ba5a5a8f5753b1eb7c14a.cylsiewx0zgx.us-east-1.rds.amazonaws.com';
$dbname   = 'totem_logs';
$user = 'dbmasteruser';
$pass = '_b?Q#0HE_xBcs?27e>)%};FsxUMA~]J}';

// Obtener el cuerpo de la solicitud
$input = file_get_contents("php://input");
$data = json_decode($input, true);

// Validar datos
if (!isset($data['id']) || !isset($data['nuevo_estado'])) {
    http_response_code(400);
    echo json_encode(["error" => "Parámetros requeridos: id y nuevo_estado"]);
    exit;
}

$id = intval($data['id']);
$nuevo_estado = $data['nuevo_estado'];

// Conexión a MySQL
$conn = mysqli_connect($host, $user, $pass, $dbname);

if (!$conn) {
    http_response_code(500);
    echo json_encode(["error" => "Error de conexión: " . mysqli_connect_error()]);
    exit;
}

// Preparar la consulta
$id_escapado = mysqli_real_escape_string($conn, $id);
$estado_escapado = mysqli_real_escape_string($conn, $nuevo_estado);

$query = "UPDATE totem_logs SET estado_transaccion = '$estado_escapado' WHERE id = $id_escapado";
$result = mysqli_query($conn, $query);

if ($result) {
    if (mysqli_affected_rows($conn) > 0) {
        echo json_encode(["success" => true, "message" => "Estado actualizado correctamente"]);
    } else {
        echo json_encode(["success" => false, "message" => "No se encontró el ID o no hubo cambios"]);
    }
} else {
    http_response_code(500);
    echo json_encode(["error" => "Error al ejecutar la consulta: " . mysqli_error($conn)]);
}

// Cerrar conexión
mysqli_close($conn);
