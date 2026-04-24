import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'
import { API_BASE_URL } from '../config'

const Delivery = () => {
    const token = localStorage.getItem('token')
    const [shops, setShops] = useState([])
    const [selectedShop, setSelectedShop] = useState(null)
    const [dropoffAddress, setDropoffAddress] = useState('')
    const [note, setNote] = useState('')
    const [vehicleType, setVehicleType] = useState('moto')
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        ; (async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/shops`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
                setShops(Array.isArray(response.data) ? response.data : [])
            } finally {
                setIsLoading(false)
            }
        })()
    }, [])

    async function requestDelivery() {
        if (!selectedShop?._id) {
            alert('Please select a shop')
            return
        }
        if (!dropoffAddress.trim()) {
            alert('Please enter dropoff address')
            return
        }

        const payload = {
            shopkeeperId: selectedShop._id,
            dropoffAddress,
            note,
            vehicleType
        }

        const response = await axios.post(`${API_BASE_URL}/delivery-requests/create`, payload, {
            headers: { Authorization: `Bearer ${token}` }
        })

        if (response.status === 201) {
            alert('Delivery requested. Shopkeeper will get an email and can accept the request.')
            setDropoffAddress('')
            setNote('')
            setSelectedShop(null)
        }
    }

    return (
        <div className='min-h-screen p-6 bg-white'>
            <div className='flex items-center justify-between'>
                <div className='text-2xl font-semibold'>Request Delivery</div>
                <Link to='/home' className='bg-black text-white px-3 py-2 rounded-lg'>Back</Link>
            </div>

            {isLoading && <div className='mt-6'>Loading shops...</div>}

            {!isLoading && (
                <div className='mt-6'>
                    <h3 className='text-lg font-medium mb-3'>Shops</h3>
                    <div className='flex flex-col gap-3'>
                        {shops.map((s) => (
                            <button
                                key={s._id}
                                onClick={() => setSelectedShop(s)}
                                className={`text-left border rounded-lg p-4 ${selectedShop?._id === s._id ? 'border-black' : ''}`}
                            >
                                <div className='font-semibold'>{s.shop?.name}</div>
                                <div className='text-sm text-gray-600'>{s.shop?.address}</div>
                                <div className='text-sm text-gray-600'>{s.phone} • {s.email}</div>
                            </button>
                        ))}

                        {shops.length === 0 && (
                            <div className='text-gray-600'>No shops registered yet.</div>
                        )}
                    </div>

                    <div className='mt-6'>
                        <h3 className='text-lg font-medium mb-2'>Delivery details</h3>
                        <input
                            className='bg-[#eeeeee] mb-3 rounded-lg px-4 py-2 border w-full text-lg placeholder:text-base'
                            type='text'
                            placeholder='Dropoff address (your location)'
                            value={dropoffAddress}
                            onChange={(e) => setDropoffAddress(e.target.value)}
                        />

                        <select
                            className='bg-[#eeeeee] mb-3 rounded-lg px-4 py-2 border w-full text-lg'
                            value={vehicleType}
                            onChange={(e) => setVehicleType(e.target.value)}
                        >
                            <option value='moto'>Moto</option>
                            <option value='auto'>Auto</option>
                            <option value='car'>Car</option>
                        </select>

                        <textarea
                            className='bg-[#eeeeee] mb-3 rounded-lg px-4 py-2 border w-full text-lg placeholder:text-base'
                            placeholder='Note (optional)'
                            rows={3}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                        />

                        <button
                            onClick={requestDelivery}
                            className='bg-green-600 text-white font-semibold px-4 py-3 rounded-lg w-full'
                        >Request Delivery</button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Delivery
