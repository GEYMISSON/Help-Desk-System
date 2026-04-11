const token = localStorage.getItem('token');

//////////////// LOGIN //////////////////

document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const message = document.getElementById('message');

    const res = await fetch('/login',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({username,password})
    });

    const data = await res.json();

    if(data.token){
        localStorage.setItem('token',data.token);
        location.href='/dashboard';
    }else{
        message.textContent=data.message;
    }
});

//////////////// PCS //////////////////

function cadastrarPC(){
fetch('/pcs',{
method:'POST',
headers:{'Content-Type':'application/json',Authorization:token},
body:JSON.stringify({
sistema:sistema.value,
placaMae:placaMae.value,
processador:processador.value,
memoria:memoria.value,
armazenamento:armazenamento.value,
fonte:fonte.value
})
}).then(()=>carregarPC());
}

function carregarPC(){
fetch('/pcs',{headers:{Authorization:token}})
.then(r=>r.json())
.then(d=>{
listaPC.innerHTML=d.map(p=>`
<tr>
<td>${p.codigo}</td>
<td>${p.sistema}</td>
<td>${p.placaMae}</td>
<td>${p.processador}</td>
<td>${p.memoria}</td>
<td>${p.armazenamento}</td>
<td>${p.fonte}</td>
<td><button onclick="excluirPC('${p._id}')">❌</button></td>
</tr>`).join('');
});
}

function excluirPC(id){
fetch(`/pcs/${id}`,{method:'DELETE',headers:{Authorization:token}})
.then(()=>carregarPC());
}