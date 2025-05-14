<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

$host = 'ls-24ab11e36d4d24df477ba5a5a8f5753b1eb7c14a.cylsiewx0zgx.us-east-1.rds.amazonaws.com';
$db   = 'totem_logs';
$user = 'dbmasteruser';
$pass = '_b?Q#0HE_xBcs?27e>)%};FsxUMA~]J}';

// Conexión a la base de datos
$mysqli = new mysqli($host, $user, $pass, $db);
if ($mysqli->connect_error) {
    http_response_code(500);
    echo json_encode(["error" => "Error de conexión"]);
    exit;
}

$rut = $_GET['rut'] ?? '';
$codigo_autorizacion = $_GET['codigo_autorizacion'] ?? '';

if (!$rut && !$codigo_autorizacion) {
    http_response_code(400);
    echo json_encode(["error" => "Debe enviar 'rut' o 'codigo_autorizacion' como parámetro"]);
    exit;
}

// Construcción dinámica de filtro
$condiciones = [];
$tipos = '';
$parametros = [];

if ($rut) {
    $condiciones[] = "rut = ?";
    $tipos .= 's';
    $parametros[] = $rut;
}
if ($codigo_autorizacion) {
    $condiciones[] = "codigo_autorizacion = ?";
    $tipos .= 's';
    $parametros[] = $codigo_autorizacion;
}

$filtro = implode(" OR ", $condiciones);

// Consulta preparada
$query = "
    SELECT t1.*
    FROM totem_logs t1
    INNER JOIN (
        SELECT codigo_reserva, MAX(id) as max_id
        FROM totem_logs
        WHERE $filtro
        GROUP BY codigo_reserva
    ) t2 ON t1.id = t2.max_id
    ORDER BY t1.id DESC
";

$stmt = $mysqli->prepare($query);
if (!$stmt) {
    http_response_code(500);
    echo json_encode(["error" => "Error en la preparación de la consulta"]);
    exit;
}

// Enlazar parámetros dinámicamente
$stmt->bind_param($tipos, ...$parametros);
$stmt->execute();
$result = $stmt->get_result();

$registros = [];
while ($row = $result->fetch_assoc()) {
    $registros[] = $row;
}

echo json_encode($registros);

$stmt->close();
$mysqli->close();
