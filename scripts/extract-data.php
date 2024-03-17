<?php

$file = "https://raw.githubusercontent.com/Haidra-Org/AI-Horde-image-model-reference/main/stable_diffusion.json";
$json = json_decode(file_get_contents($file), true, flags: JSON_THROW_ON_ERROR);

$tab = '  ';

$sdRepoFile = fn (string $file) => __DIR__ . "/../src/app/types/sd-repo/{$file}";
$columnToEnum = function (string $column, string $file, string $enumName) use ($json, $tab) {
  $values = array_unique(array_column($json, $column));
  $content = "export enum {$enumName} {\n";
  $content .= implode("\n", array_map(function ($value) use ($tab) {
    $key = ucfirst(preg_replace_callback('@[ _](.)@', fn(array $matches) => ucfirst($matches[1]), $value));
    return "{$tab}{$key} = '{$value}',";
  }, $values));
  $content .= "\n}\n";

  file_put_contents($file, $content);
};

$columnToEnum('baseline', $sdRepoFile('baseline-model.ts'), 'BaselineModel');
$columnToEnum('type', $sdRepoFile('model-type.ts'), 'ModelType');
$columnToEnum('style', $sdRepoFile('model-style.ts'), 'ModelStyle');
$columnToEnum('optimization', $sdRepoFile('model-optimization.ts'), 'ModelOptimization');

$mappedColumns = [
  'name',
  'baseline',
  'type',
  'inpainting',
  'description',
  'showcases',
  'version',
  'style',
  'nsfw',
  'download_all',
  'config',
  'available',
  'size_on_disk_bytes',
  'homepage',
  'features_not_supported',
  'requirements',
  'optimization',
  'tags',
  'trigger',
  'min_bridge_version',
];
$optional = [
  'showcases',
  'available',
  'size_on_disk_bytes',
  'homepage',
  'features_not_supported',
  'requirements',
  'optimization',
  'tags',
  'trigger',
  'min_bridge_version',
];
$knownRequirements = [
  'min_steps',
  'max_steps',
  'cfg_scale',
  'samplers',
  'schedulers',
  'clip_skip',
];
$knownSchedulers = [
  'karras',
];

foreach ($json as $modelName => $config) {
  foreach ($mappedColumns as $mappedColumn) {
    if (!array_key_exists($mappedColumn, $config) && !in_array($mappedColumn, $optional, true)) {
      echo "Mapped column not found for model '{$modelName}': '{$mappedColumn}'", PHP_EOL;
    }
  }

  foreach ($config as $key => $value) {
    if (!in_array($key, $mappedColumns, true)) {
      echo "Column missing in mapping: '{$key}' (model: {$modelName})", PHP_EOL;
    }
  }

  foreach ($config['requirements'] ?? [] as $requirement => $value) {
    if (!in_array($requirement, $knownRequirements, true)) {
      echo "Unsupported requirement: {$requirement} (model: {$modelName})", PHP_EOL;
    }
  }

  foreach ($config['requirements']['schedulers'] ?? [] as $scheduler) {
    if (!in_array($scheduler, $knownSchedulers, true)) {
      echo "Unsupported scheduler: {$scheduler} (model: {$modelName})", PHP_EOL;
    }
  }
}
