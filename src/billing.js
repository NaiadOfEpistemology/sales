import { createClient } from '@supabase/supabase-js'

const supabase=createClient(
  'https://vhltvlfgauerqltntzvs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZobHR2bGZnYXVlcnFsdG50enZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4ODA4NTEsImV4cCI6MjA3MjQ1Njg1MX0.awJxp5p-NMlPaBNw-WHU8ri_4QAEHnMl_5hwIQrTAms'
)

let cart=[]
let customer={}
let scanLock=false

document.getElementById('customerForm').addEventListener('submit',e=>{
  e.preventDefault()
  customer={
    name:document.getElementById('customerName').value.trim(),
    phone:document.getElementById('customerPhone').value.trim()
  }
  document.getElementById('customerDisplay').textContent=`Customer: ${customer.name} (${customer.phone||''})`
})

document.getElementById('barcodeInput').addEventListener('input',e=>{
  const code=e.target.value.trim()
  if(code.length<8||scanLock)return
  scanLock=true
  setTimeout(()=>{scanLock=false},300)
  addScannedItem(code)
  e.target.value=''
})

async function addScannedItem(code){
  try{
    const{data,error}=await supabase.from('products').select('*').eq('barcode',code).single()
    if(error||!data){alert("Product not found");return}
    if(data.qty_active<=0){alert("No active stock available");return}
    const discountInput=parseFloat(document.getElementById('discountInput').value)||0
    const finalPrice=data.price-(data.price*discountInput/100)
    const existingIndex=cart.findIndex(item=>item.id===data.id)
    if(existingIndex!==-1){
      if(cart[existingIndex].qty+1>data.qty_active){alert("Not enough active stock");return}
      cart[existingIndex].qty+=1
    }else{
      cart.push({id:data.id,name:data.name,price:data.price,discount:discountInput,finalPrice,qty:1,active:data.qty_active})
    }
    renderCart()
  }catch(err){
    console.error("Barcode fetch error:",err)
    alert("Error fetching product.")
  }
}

function renderCart(){
  const tbody=document.querySelector('#cart-table tbody')
  tbody.innerHTML=''
  let total=0
  cart.forEach((item,idx)=>{
    const lineTotal=item.finalPrice*item.qty
    total+=lineTotal
    const row=document.createElement('tr')
    row.innerHTML=`
      <td>${item.name}</td>
      <td>${item.price.toFixed(2)}</td>
      <td><input type="number" value="${item.discount}" min="0" max="100" onchange="updateDiscount(${idx},this.value)"></td>
      <td>${item.finalPrice.toFixed(2)}</td>
      <td><input type="number" value="${item.qty}" min="1" max="${item.active}" onchange="updateQty(${idx},this.value)"></td>
      <td>${lineTotal.toFixed(2)}</td>
      <td><button onclick="removeItem(${idx})">X</button></td>
    `
    tbody.appendChild(row)
  })
  document.getElementById('grandTotal').textContent=total.toFixed(2)
}

window.updateQty=(idx,val)=>{
  const q=parseInt(val)
  if(q>cart[idx].active){alert("Exceeds active stock");return}
  cart[idx].qty=q
  renderCart()
}

window.updateDiscount=(idx,val)=>{
  const discount=parseFloat(val)||0
  const item=cart[idx]
  item.discount=discount
  item.finalPrice=item.price-(item.price*discount/100)
  renderCart()
}

window.removeItem=idx=>{
  cart.splice(idx,1)
  renderCart()
}

document.getElementById('finalizeBill').addEventListener('click',async()=>{
  if(!customer.name){alert("Set customer first");return}
  if(cart.length===0){alert("Cart is empty");return}
  const total=cart.reduce((sum,i)=>sum+(i.finalPrice*i.qty),0)
  try{
    const{data:bill,error:billErr}=await supabase.from('bills').insert([{
      customer_name:customer.name,
      customer_phone:customer.phone,
      total_amount:total
    }]).select().single()
    if(billErr)throw billErr
    for(const item of cart){
      const{error:saleError}=await supabase.from("sales").insert({
        product_id:item.id,
        quantity_sold:item.qty,
        bill_id:bill.id,
        price_at_sale:item.price
      })
      if(saleError)console.error("Sale insert error:",saleError)
      const{data:product,error:fetchError}=await supabase.from('products').select('*').eq('id',item.id).single()
      if(!fetchError){
        if(item.qty>product.qty_active){alert("Not enough active stock for "+product.name);continue}
        const newActive=product.qty_active-item.qty
        const newQty=product.quantity-item.qty
        const{error:updateError}=await supabase.from('products').update({quantity:newQty,qty_active:newActive}).eq('id',item.id)
        if(updateError)console.error("Stock update error:",updateError)
      }
    }
    window.latestBill={...bill,items:[...cart],customer:{...customer}}
    alert("Bill finalized. ID: "+bill.id)
    cart=[]
    renderCart()
    document.getElementById('grandTotal').textContent="0"
  }catch(err){
    console.error("Finalize bill error:",err)
    alert("Failed to create bill.")
  }
})

document.getElementById('printBill').addEventListener('click',()=>{
  if(!window.latestBill){alert("No bill to print");return}
  const bill=window.latestBill
  const now=new Date().toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})
  let html=`
    <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;color:#000;padding:1rem;">
      <h2 style="text-align:center;margin-bottom:0.5rem;">Ruby Automotives</h2>
      <p style="text-align:center;margin-top:0;">Purchase Bill</p>
      <hr>
      <p><strong>Date & Time:</strong> ${now}</p>
      <p><strong>Customer:</strong> ${bill.customer.name} (${bill.customer.phone||"-"})</p>
      <p><strong>Bill ID:</strong> ${bill.id}</p>
      <table style="width:100%;border-collapse:collapse;margin-top:1rem;">
        <thead>
          <tr>
            <th style="border:1px solid #ccc;padding:0.5rem;text-align:left;">Item</th>
            <th style="border:1px solid #ccc;padding:0.5rem;text-align:right;">Qty</th>
            <th style="border:1px solid #ccc;padding:0.5rem;text-align:right;">Price</th>
            <th style="border:1px solid #ccc;padding:0.5rem;text-align:right;">Total</th>
          </tr>
        </thead>
        <tbody>
  `
  bill.items.forEach(it=>{
    html+=`
      <tr>
        <td style="border:1px solid #ccc;padding:0.5rem;">${it.name}</td>
        <td style="border:1px solid #ccc;padding:0.5rem;text-align:right;">${it.qty}</td>
        <td style="border:1px solid #ccc;padding:0.5rem;text-align:right;">₹${it.finalPrice.toFixed(2)}</td>
        <td style="border:1px solid #ccc;padding:0.5rem;text-align:right;">₹${(it.finalPrice*it.qty).toFixed(2)}</td>
      </tr>
    `
  })
  html+=`
        </tbody>
      </table>
      <h3 style="text-align:right;margin-top:1rem;">Grand Total: ₹${bill.total_amount}</h3>
      <hr>
      <p style="text-align:center;">Thank you for your purchase</p>
    </div>
  `
  const w=window.open("","PrintBill","width=600,height=600")
  w.document.write(html)
  w.print()
  w.close()
})