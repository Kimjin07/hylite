# Scan all word entries in units-data.js and books-extra.js for data problems
# ASCII-only script; reads UTF-8, prints report
$ErrorActionPreference = 'Stop'
$enc = [System.Text.Encoding]::UTF8
$files = @(
  'C:\Users\27894\Desktop\HY\vocabulary\src\units-data.js',
  'C:\Users\27894\Desktop\HY\vocabulary\src\books-extra.js'
)
$issues = New-Object System.Collections.Generic.List[string]
$totalEntries = 0

foreach ($f in $files) {
  $txt = [IO.File]::ReadAllText($f, $enc)
  $fname = Split-Path $f -Leaf
  # find every "const X = [ ... ];" array (top-level data blocks)
  $blocks = [regex]::Matches($txt, 'const\s+(\w+)\s*=\s*(\[.*?\]);', 'Singleline')
  foreach ($b in $blocks) {
    $varName = $b.Groups[1].Value
    $json = $b.Groups[2].Value
    try { $data = $json | ConvertFrom-Json } catch { $issues.Add("[$fname/$varName] JSON parse FAILED: $($_.Exception.Message)"); continue }
    foreach ($unit in $data) {
      foreach ($w in $unit.words) {
        $totalEntries++
        $word = [string]$w[0]; $gloss = [string]$w[1]; $phon = [string]$w[2]
        $loc = "[$fname/$varName $($unit.id)] '$word'"
        # 1) XML/HTML fragments anywhere
        foreach ($fieldPair in @(@('word',$word), @('gloss',$gloss), @('phon',$phon))) {
          $fn = $fieldPair[0]; $fv = $fieldPair[1]
          if ($fv -match '<[^<>]*>' -or $fv -match 'w:\w+=' -or $fv -match '</?w:') { $issues.Add("$loc ${fn} contains XML/HTML: $fv") }
          if ($fv -match [char]0xFFFD) { $issues.Add("$loc ${fn} contains replacement char (mojibake): $fv") }
          if ($fv -match '[\x00-\x08\x0B\x0C\x0E-\x1F]') { $issues.Add("$loc ${fn} contains control chars") }
        }
        # 2) word field sanity: expect English letters plus space - ' . & / ( ) = [ ] , (=同义词组 []教学标注)
        if ($word -notmatch "^[A-Za-z(\[][A-Za-z0-9 '\-\.&/()=\[\],]*$") { $issues.Add("$loc word field suspicious: '$word'") }
        # 3) full-width quotes between ASCII letters (apostrophe bug)
        $lq=[char]0x2018; $rq=[char]0x2019
        if ($word -match "(?<=[A-Za-z])[$lq$rq](?=[A-Za-z])") { $issues.Add("$loc word has fullwidth apostrophe: $word") }
        # 4) empty gloss
        if ([string]::IsNullOrWhiteSpace($gloss)) { $issues.Add("$loc gloss is EMPTY") }
        # 5) gloss should contain at least one CJK char (it is a Chinese gloss) unless short abbreviation
        if ($gloss -ne '' -and $gloss -notmatch '\p{IsCJKUnifiedIdeographs}') { $issues.Add("$loc gloss has NO Chinese: $gloss") }
        # 6) gloss containing long ASCII runs (likely leaked source text), allow POS labels like 'n. ' 'vt. '
        $g2 = $gloss -replace '\b(n|v|vt|vi|a|ad|adv|adj|prep|conj|pron|num|int|art|aux|abbr|pl)\.', ''
        if ($g2 -match '[A-Za-z0-9"=/<>_:;]{15,}') { $issues.Add("$loc gloss has long ASCII run: $gloss") }
      }
    }
  }
}
"scanned entries: $totalEntries"
"issues found: $($issues.Count)"
$issues | ForEach-Object { $_ }
