<?php
// CampusTix shared data API: stores events and registrations in data.json.
// GET  api.php  -> returns the full state
// POST api.php  -> applies {events:{upsert,delete}, regs:{upsert,delete}, init} then returns the full state
header('Content-Type: application/json');
$file = __DIR__ . '/data.json';
$fp = fopen($file, 'c+');
flock($fp, LOCK_EX); // one request at a time, so simultaneous users don't clobber each other

$state = json_decode(stream_get_contents($fp), true);
if (!is_array($state)) $state = ['init' => false, 'events' => [], 'regs' => []];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $in = json_decode(file_get_contents('php://input'), true) ?: [];
    foreach (['events', 'regs'] as $col) {
        $changes = $in[$col] ?? [];
        foreach ($changes['upsert'] ?? [] as $item) {
            $found = false;
            foreach ($state[$col] as $i => $existing) {
                if ($existing['id'] === $item['id']) { $state[$col][$i] = $item; $found = true; break; }
            }
            if (!$found) $state[$col][] = $item;
        }
        $deleteIds = $changes['delete'] ?? [];
        if ($deleteIds) {
            $state[$col] = array_values(array_filter($state[$col], fn($x) => !in_array($x['id'], $deleteIds, true)));
        }
    }
    if (!empty($in['init'])) $state['init'] = true;
    ftruncate($fp, 0); rewind($fp);
    fwrite($fp, json_encode($state));
}

flock($fp, LOCK_UN);
fclose($fp);
echo json_encode($state);
