let SEEN = {}
let ELEMS = []
for (let e of JSON.parse(localStorage.getItem('infinite-craft-data')).elements) {
    SEEN[e.text] = e
    ELEMS.push(e.text)
}
shuffle(ELEMS)
SEEN_COMBOS = {}
async function combine(a,b, manual = true) {
    if (!manual) {
        if (SEEN_COMBOS[a + ';;' + b] !== undefined) return "Seen combo"
        SEEN_COMBOS[a + ';;' + b] = null
    }
    let res = (await (await fetch("https://neal.fun/api/infinite-craft/pair?first=" + encodeURIComponent(a) + "&second=" + encodeURIComponent(b), {
        "headers": {
            "accept": "*/*",
            "accept-language": "en-IE,en-US;q=0.9,en;q=0.8",
            "sec-ch-ua": "\"Not A(Brand\";v=\"99\", \"Google Chrome\";v=\"121\", \"Chromium\";v=\"121\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"Windows\"",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin"
        },
        "referrer": "https://neal.fun/infinite-craft/",
        "referrerPolicy": "strict-origin-when-cross-origin",
        "body": null,
        "method": "GET",
        "mode": "cors",
        "credentials": "include"
    })).json());  
    if (manual) return res  
    if (res.result === 'Nothing') return 'Nothing'
    if (SEEN[res.result] !== undefined) return `Seen: ${res.result}`
    console.log(`Found '${res.result}', ${a} + ${b}`)
    res.combo = [a,b]
    SEEN[res.result] = res
    ELEMS.push(res.result)
    let elems = JSON.parse(localStorage.getItem('infinite-craft-data'))
    elems.elements.push({text: res.result, emoji: res.emoji, discovered: res.isNew, combo: res.combo})
    localStorage.setItem('infinite-craft-data', JSON.stringify(elems))
    return res
}

let STOP = false
async function search(limit, delayMin, delayMax, override = null, filter = () => true, stopwords = [], inorder = false) {
    if (inorder && (override === null || override.length > 1)) return "must specify 1 override to use inorder"
    if (override !== null) {
        for (let e of override) {
            if (SEEN[e] === undefined) return `'${e}' not found yet`
        }
    }
    let c = 0
    let elems = ELEMS.filter((e) => filter(e))
    while (c < limit && !STOP) {
        let a, b = undefined
        if (inorder) {
            if (c >= elems.length) return "searched all"
            a = override[0]
            b = elems[c]
        } else {
            a = override !== null ? override[Math.floor(Math.random()*override.length)] : elems[Math.floor(Math.random()*elems.length)]
            b = elems[Math.floor(Math.random()*elems.length)]
        }
        let res = await combine(a, b, false)
        if (res.result !== undefined) {
            if (stopwords.includes(res.result)) return 'stop word found'
            if (filter(res.result)) elems.push(res.result)
        } 
        await delay(Math.random()*(delayMax - delayMin) + delayMin)
        ++c
        if (c % 10 == 0) console.log(`Searched ${c}`)
    }
    console.log("STOPPED")
}

async function delay(ms) {
    // return await for better async stack trace support in case of errors.
    return await new Promise(resolve => setTimeout(resolve, ms));
}

function shuffle(array) {
    let currentIndex = array.length,  randomIndex;
  
    // While there remain elements to shuffle.
    while (currentIndex > 0) {
  
      // Pick a remaining element.
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
  
      // And swap it with the current element.
      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex], array[currentIndex]];
    }
  
    return array;
}

function sortFound() {
    let data = JSON.parse(localStorage.getItem('infinite-craft-data'))
    data.elements.sort((a,b) => a.text < b.text ? -1 : 1)
    localStorage.setItem('infinite-craft-data', JSON.stringify(data))
}

function shuffleFound() {
    let data = JSON.parse(localStorage.getItem('infinite-craft-data'))
    shuffle(data.elements)
    localStorage.setItem('infinite-craft-data', JSON.stringify(data))
}

function printData() {
    console.log(JSON.parse(localStorage.getItem('infinite-craft-data')))
}

function findCraftPath(elem) {
    let lookup = {}
    let data = JSON.parse(localStorage.getItem('infinite-craft-data'))
    for (let e of data.elements) {
        lookup[e.text] = e
    }
    let todo = [elem]
    let ret = []
    while (todo.length > 0) {
        let v = todo.pop()
        let craft = lookup[v]
        if (craft.combo !== undefined) {
            ret.push([craft.combo[0], craft.combo[1], v])
            todo.push(craft.combo[0])
            todo.push(craft.combo[1])
        }
    }
    ret.reverse()
    return ret
}

function showCraftPath(elem) {
    let ret = findCraftPath(elem)
    let crafted = {}
    let ret2 = []
    for (let e of ret) {
        if (crafted[e[2]] !== undefined) continue
        crafted[e[2]] = null
        ret2.push(`${e[0]} + ${e[1]} = ${e[2]}`)
    }
    return ret2
}

function graphvizCraftPath2(elem) {
    let lookup = {}
    let data = JSON.parse(localStorage.getItem('infinite-craft-data'))
    for (let e of data.elements) {
        lookup[e.text] = e
    }
    let todo = [elem]
    let crafted = {}
    let labelLookup = {[elem]: 'a0'}
    let labels = [`a0 [label="${lookup[elem].emoji} ${elem}"]`]
    let graph = []
    let i = 1
    while (todo.length > 0) {
        let v = todo.shift()
        if (crafted[v] !== undefined) continue
        crafted[v] = null
        let craft = lookup[v]
        if (craft.combo !== undefined) {
            let l0 = `a${i++}`
            labelLookup[craft.combo[0]] = l0
            labels.push(`${l0} [label="${lookup[craft.combo[0]].emoji} ${craft.combo[0]}"]`)
            let l1 = `a${i++}`
            labelLookup[craft.combo[1]] = l1
            labels.push(`${l1} [label="${lookup[craft.combo[1]].emoji} ${craft.combo[1]}"]`)
            graph.push(`${labelLookup[v]} -> ${l0}`)
            graph.push(`${labelLookup[v]} -> ${l1}`)
            todo.push(craft.combo[0])
            todo.push(craft.combo[1])
        }
    }
    console.log([labels, graph])
    return `digraph G {\n ${labels.join('\n')}\n${graph.join('\n')}\n}`
}