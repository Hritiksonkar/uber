import React, { useContext, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { API_BASE_URL } from '../config'
import { ShopkeeperDataContext } from '../context/ShopkeeperContext'

const ShopkeeperSignup = () => {
    const navigate = useNavigate()
    const { setShopkeeper } = useContext(ShopkeeperDataContext)

    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [email, setEmail] = useState('')
    const [phone, setPhone] = useState('')
    const [shopName, setShopName] = useState('')
    const [shopAddress, setShopAddress] = useState('')
    const [password, setPassword] = useState('')

    const submitHandler = async (e) => {
        e.preventDefault()

        const payload = {
            fullname: {
                firstname: firstName,
                lastname: lastName
            },
            email,
            phone,
            password,
            shop: {
                name: shopName,
                address: shopAddress
            }
        }

        const response = await axios.post(`${API_BASE_URL}/shopkeepers/register`, payload)

        if (response.status === 201) {
            const data = response.data
            setShopkeeper(data.shopkeeper)
            localStorage.setItem('token', data.token)
            navigate('/shopkeeper-home')
        }
    }

    return (
        <div className='py-5 px-5 h-screen flex flex-col justify-between'>
            <div>
                <div className='text-2xl font-semibold mb-3'>Shopkeeper Panel</div>

                <form onSubmit={submitHandler}>
                    <h3 className='text-lg w-full font-medium mb-2'>Owner name</h3>
                    <div className='flex gap-4 mb-7'>
                        <input
                            required
                            className='bg-[#eeeeee] w-1/2 rounded-lg px-4 py-2 border text-lg placeholder:text-base'
                            type='text'
                            placeholder='First name'
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                        />
                        <input
                            className='bg-[#eeeeee] w-1/2 rounded-lg px-4 py-2 border text-lg placeholder:text-base'
                            type='text'
                            placeholder='Last name'
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                        />
                    </div>

                    <h3 className='text-lg font-medium mb-2'>Shop details</h3>
                    <input
                        required
                        className='bg-[#eeeeee] mb-3 rounded-lg px-4 py-2 border w-full text-lg placeholder:text-base'
                        type='text'
                        placeholder='Shop name'
                        value={shopName}
                        onChange={(e) => setShopName(e.target.value)}
                    />
                    <input
                        required
                        className='bg-[#eeeeee] mb-7 rounded-lg px-4 py-2 border w-full text-lg placeholder:text-base'
                        type='text'
                        placeholder='Shop address'
                        value={shopAddress}
                        onChange={(e) => setShopAddress(e.target.value)}
                    />

                    <h3 className='text-lg font-medium mb-2'>Contact</h3>
                    <input
                        required
                        className='bg-[#eeeeee] mb-3 rounded-lg px-4 py-2 border w-full text-lg placeholder:text-base'
                        type='email'
                        placeholder='Email'
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <input
                        required
                        className='bg-[#eeeeee] mb-7 rounded-lg px-4 py-2 border w-full text-lg placeholder:text-base'
                        type='text'
                        placeholder='Mobile number'
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                    />

                    <h3 className='text-lg font-medium mb-2'>Password</h3>
                    <input
                        required
                        className='bg-[#eeeeee] mb-7 rounded-lg px-4 py-2 border w-full text-lg placeholder:text-base'
                        type='password'
                        placeholder='Password'
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />

                    <button className='bg-[#111] text-white font-semibold mb-3 rounded-lg px-4 py-2 w-full text-lg'>Create Shopkeeper Account</button>
                </form>

                <p className='text-center'>Already have an account? <Link to='/shopkeeper-login' className='text-blue-600'>Login here</Link></p>
            </div>

            <div>
                <Link
                    to='/login'
                    className='bg-[#d5622d] flex items-center justify-center text-white font-semibold mb-5 rounded-lg px-4 py-2 w-full text-lg'
                >Sign in as User</Link>
            </div>
        </div>
    )
}

export default ShopkeeperSignup
