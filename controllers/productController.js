import { Product } from "../models/productModel.js";
import getDataUri from "../utils/dataUri.js";
import cloudinary from "../utils/cloudinary.js";

// export const addProduct = async (req, res) => {
//     try {
//         const { productName, productDesc, productPrice, category, brand } = req.body
//         const userId =req.user._id
//         if (!productName || !productDesc || !productPrice || !category || !brand) {
//             return res.status(400).json({
//                 success: false,
//                 message: "All fields are required"
//             })
//         }
//         // Handle multiple image uploads
//         let productImg = [];
//         if (req.files && req.files.length > 0) {
//             for (let file of req.files) {
//                 const fileUrl = getDataUri(file)
//                 const result = await cloudinary.uploader.upload(fileUrl.content, {
//                     folder: "mern_products" //cloudinary folder name 
//                 });
//                 productImg.push({
//                     url: result.secure_url,
//                     public_id: result.public_id
//                 })
//             }
//         }
//         // create a product in DB
//         const newProduct = await Product.create({
//             userId,
//             productName,
//             productDesc,
//             productPrice,
//             category,
//             brand,
//             productImg,//array of objects [{url,public_id}]
//         })
//         return res.status(200).json({
//             success: true,
//             message: "Product added successfully !",
//             product: newProduct
//         })
//     } catch (error) {
//         return res.status(500).json({
//             success: false,
//             message: error.message
//         })
//     }
// }
export const addProduct = async (req, res) => {
  try {
        console.log("FILES:", req.files); // 👈 ADD THIS LINE HERE
    const { productName, productDesc, productPrice, category, brand } = req.body;
    const userId = req.id;

    if (
      !productName ||
      !productDesc ||
      productPrice === undefined ||
      !category ||
      !brand
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one product image is required",
      });
    }

    let productImg = [];

    for (let file of req.files) {
      const fileUrl = getDataUri(file);

      const result = await cloudinary.uploader.upload(
        fileUrl.content,
        { folder: "mern_products" }
      );

      productImg.push({
        url: result.secure_url,
        public_id: result.public_id,
      });
    }

    const newProduct = await Product.create({
      userId,
      productName,
      productDesc,
      productPrice,
      category,
      brand,
      productImg,
    });

    return res.status(201).json({
      success: true,
      message: "Product added successfully!",
      product: newProduct,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAllProduct = async (_, res) => {
    try {
        const products = await Product.find()
        if (!products) {
            return res.status(404).json({
                success: false,
                message: "No product available",
                products: []
            })
        }
        return res.status(200).json({
            success:true,
            products
        })
    } catch (error) {
        return res.status(500).json({
            success:false,
            message:error.message
        })
    }
}