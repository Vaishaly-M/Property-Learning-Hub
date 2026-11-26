<?php

$docx = dirname(__DIR__, 2) . '/Freedom_Property_Academy_Training_Agreement.docx';
$z = new ZipArchive();
if ($z->open($docx) !== true) {
    fwrite(STDERR, "Cannot open docx\n");
    exit(1);
}

echo "Media files:\n";
for ($i = 0; $i < $z->numFiles; $i++) {
    $name = $z->getNameIndex($i);
    if (str_contains($name, 'media/')) {
        echo "  $name (" . $z->statIndex($i)['size'] . " bytes)\n";
    }
}

$xml = $z->getFromName('word/document.xml');
preg_match_all('/<w:t[^>]*>([^<]+)<\/w:t>/', $xml, $matches);
echo "\nSignature-related text:\n";
foreach ($matches[1] as $text) {
    if (preg_match('/andrei|bosancu|ceo|name:|position:|signature:|date:/i', $text)) {
        echo "  $text\n";
    }
}

$outPath = __DIR__ . '/../resources/agreements/academy_signature.png';
$image = $z->getFromName('word/media/image1.png');
if ($image !== false) {
    file_put_contents($outPath, $image);
    echo "\nExtracted signature to $outPath (" . strlen($image) . " bytes)\n";
}

$z->close();
