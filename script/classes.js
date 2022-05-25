class PAF {
  constructor(paf) {
    this.query = paf[0];
    this.qlen = Number(paf[1]);
    this.qstart = Number(paf[2]);
    this.qend = Number(paf[3]);
    this.strand = paf[4];
    this.subject = paf[5];
    this.slen = Number(paf[6]);
    this.sstart = Number(paf[7]);
    this.send = Number(paf[8]);
    this.mbase = Number(paf[9]);
    this.mlen = Number(paf[10]);
    this.mapq = Number(paf[11]);
    this.species = '';
    this.attr = {}

    for (let i=12; i<paf.length; i++) {
      let a = paf[i].split(':');
      let v;
      if (a[1] == 'i' || a[1] == 'f') {
        v = Number(a[2])
      }else{
        v = a[2]
      }

      this.attr[a[0]] = v;
    }

    this.identity = ((1 - this.attr['de']) * 100).toFixed(1);
    this.scov = (this.send - this.sstart) / this.slen * 100;
  }

  out_tble_row () {
    let row = {};
    row['Query'] = this.query;
    row['Species_1'] = `${this.species} (${this.subject})`;
    row['Score_1'] = this.attr['AS'];
    row['Homology_1'] = this.identity + '%';

    return row
  }
}

class Query {
  constructor(id) {
    this.id = id;
    this.hits = {};

    this.bestHitsInSpecies = [];
    this.filteredHits = [];
  }

  add_hit (hit) {
    if (!(hit.species in this.hits)) {
      this.hits[hit.species] = []
    }
    this.hits[hit.species].push(hit)
  }

  selectHits () {
    function comp(paf1, paf2) {
      if (paf1.attr['AS'] > paf2.attr['AS']) {
        return -1
      }
      if (paf1.attr['AS'] < paf2.attr['AS']) {
        return 1
      }
      return 0
    }

    this.bestHitsInSpecies = [] ;

    if (this.hits) {
      let keys = Object.keys(this.hits);
      for (let i=0; i<keys.length; i++) {
        let sp = keys[i];
        this.hits[sp].sort(comp);
        this.bestHitsInSpecies.push(this.hits[sp][0])
      }
      this.bestHitsInSpecies.sort(comp);
      let maxAS = this.bestHitsInSpecies[0].attr['AS'];
      for (let i=0;i<this.bestHitsInSpecies.length;i++) {
        let h = this.bestHitsInSpecies[i];
        if (h.attr['AS'] > maxAS * 0.6){
          this.filteredHits.push(h)
        }
      }
    }
  }

  out_tble_rows () {
    if (this.filteredHits) {
      let rows = [];
      let hs = this.filteredHits;
      for (let i=0; i<hs.length; i++){
        let h = hs[i];
        let row = {};
        if (i == 0) {
          row['Query'] = `${this.id}`
        } else {
          row['Query'] = `   &#x2514`
        }
        if (h.identity >=98) {
          row[`Species`] = `<span style="color:#006400"><b><i>${h.species}</i></b></span>`;
          row[`Score`] = `<span style="color:#ff8c00"><b>${h.attr['AS']}</b></span>`;
          row[`Homology`] = `<span style="color:#ff4500"><b>${h.identity}%</b></span>`;
        }else{
          row[`Species`] = `<span style="color:gray"><i>${h.species}</i></span>`;
          row[`Score`] = `<span style="color:gray">${h.attr['AS']}</span>`;
          row[`Homology`] = `<span style="gray:red">${h.identity}%</span>`;
        }
        rows.push(row)
      }
      return rows
    }
  }
}

function select_top_hit(pafs) {
  let current_max = {};
  let buffer = {};
  for (let i=0; i<pafs.length; i++) {
    let q = pafs[i].query;
    let s = pafs[i].attr['AS'];
    if (q in buffer) {
      if (buffer[q].attr['AS'] < s) {
        buffer[q] = pafs[i];
      }
    } else {
      buffer[q] = pafs[i]
    }
  }
  return Object.values(buffer);
}

class fastaEntry {
  constructor(id, seq='', sourceFile='') {
    this.id = id;
    this.original_id = id;
    this.seq = seq;
    this.sourceFile = sourceFile;
    this.include = true;
    this.len = seq.length;
    this.num_unknown = seq.split(/[Nn]/).length - 1;
  }

  extendSeq(instr){
    let tmp = $.trim(instr);
    this.seq += tmp;
    this.len += tmp.length;
    this.num_unknown += tmp.split(/[Nn]/).length - 1
  }

  outFastaStr(lineLen=80){
    let outstrArray = [];
    outstrArray.push('>' + this.id );
    let tmp = [];
    for (let start=0; start < this.seq.length; start+=lineLen){
      outstrArray.push(this.seq.substr(start, lineLen))
    }
    return outstrArray.join('\n') + '\n';
  }
}

function parseFASTA(fastaStr, fileName=''){
  let inLines = fastaStr.split(/\r?\r?\n/);
  let outFastaEntries = [];
  let e = null;

  if (!inLines[0].startsWith('>')) {
    window.alert(fileName + ' does not seem FASTA.');
    return
  }

  for (let i=0; i < inLines.length; i++){
    let line = inLines[i];
    if (line.startsWith('>')){
      if (e){
        outFastaEntries.push(e)
      }
      let h = line.replace(/^>/, '');
      e = new fastaEntry(h,'',fileName)
    }else{
      if (line){
        e.extendSeq(line)
      }
    }
  }

  if (e){
    outFastaEntries.push(e)
  }

  return outFastaEntries
}

var sampledata =
`>sample1
TATTTTGACTATACGAAGGTATTGAAATAAGATTTTAAATGAGTGCTAAGAGAATGGTTTAACAATTAATAACTTTCTTTATTTT
AAAAATTAAATTTAATTTTTTTGTGAGGAAGCAAAAATAAAGATTAGGGACAAGAAGACCCTATGAATTTTAAATTAGTATTTAT
ATTAATTGTTAATTTAATATTAATTTTGTTGGGGCGACAGAAAAAGAATAATTATCTTTTAATAATAAGTTAATTTAGATCCATT
ATTTAGTGATTTAATGAGAAAAATACTCTAGGGATAACAGCGTAATAATTTTGGATAGTTCTTATAGATAAAATAGTTTGCGACC
TCGATGTTGGATTAGGATTCTTTTTTAATGAAGAAGTTAAAAAAAGAAGTTTGTTCAACTTTTAAATTCC
>sample2
TATTTTGACTATACAAAGGTATTGTAATAAGACTTTAATTGAGTGCTAAAAGAATGGAATTTCAAAAAAAGGCTATCTTGAATTT
CAAAATTGAAATTATTTTTATTTGTGAAGAAACAATAATTAAGATTAAGGACAAGAAGACCCTAAGAATTTTTAAATTTATAAAA
AAAGTACTTTTTTTATAAATTTTTAATTGGGGCGATTAAAAAATATTATTAACTTTTAATTACAAAAAATGATCCATTATTAATG
ATAAAATGCAAAAAATACTCTAGGGATAACAGCGTAATAATTTTAGATAGATCTTATAGAAAAAATAGTTTGCGACCTCGATGTT
GGATTAGGATTCTTTTTTAATGAAGAAGTTAAAAAAAGAAGTTTGTTCAACTTTTAAAATCC
`
