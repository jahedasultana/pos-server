const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000

app.use(cors());
app.use(express.json());

//const uri = "mongodb://localhost:27017"
//console.log(uri);
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.oy4gwmh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`


// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.6ypdnj9.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    const userCollections = client.db('pos-soft').collection('users');
    const productCollections = client.db('pos-soft').collection('products');
    const customerCollections = client.db('pos-soft').collection('customers');
    const salesCollections = client.db('pos-soft').collection('sales');
    const nagadSalesCollections = client.db('pos-soft').collection('nagad-sales');
    const productsBuyCollections = client.db('pos-soft').collection('productsBuy');

    // get users from db
    app.get('/users', async (req, res) => {
      const result = await userCollections.find().toArray();
      res.send(result);
    })
    // Add products route here:
    app.post('/add-product', async (req, res) => {
      try {
        const productData = {
          ...req.body,
          creationDate: new Date(), // Add current date as creation date
        };
        // Insert the product data into the "products" collection
        const result = await productCollections.insertOne(productData);

        res.status(201).json({ message: 'Product added successfully', productId: result.insertedId });
      } catch (error) {
        console.error('Error adding product:', error);
        res.status(500).json({ message: 'Failed to add product', error });
      }
    });

    // Fetch products for table data show.
    app.get("/products", async (req, res) => {
      try {
        // Fetch products and sort them by creationDate in descending order
        const products = await productCollections.find({}).sort({ creationDate: -1 }).toArray();
        res.status(200).json(products);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch products" });
      }
    });

    // product table data delete api's here.
    app.delete("/products/:id", async (req, res) => {
      const productId = req.params.id;
      // console.log(productId)

      try {
        const result = await productCollections.deleteOne({ _id: new ObjectId(productId) });

        if (result.deletedCount === 1) {
          res.json({ message: "Product deleted successfully" });
        } else {
          res.status(404).json({ message: "Product not found" });
        }
      } catch (error) {
        res.status(500).json({ message: "Error deleting product", error });
      }
    });
    // get products from update route by ID api's here:
    app.get("/products/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const product = await productCollections.findOne({ _id: new ObjectId(id) });
        if (!product) {
          return res.status(404).json({ message: "Product not found" });
        }
        res.json(product);
      } catch (error) {
        res.status(500).json({ message: "Error fetching product", error });
      }
    });
    // update products by ID api's here:
    app.put("/products/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const updatedData = req.body;

        // Remove undefined fields (like optional image URL)
        Object.keys(updatedData).forEach((key) => {
          if (updatedData[key] === undefined) delete updatedData[key];
        });

        const result = await productCollections.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedData }
        );

        if (result.modifiedCount === 0) {
          return res.status(404).json({ message: "Product not found or no changes made" });
        }

        res.json({ message: "Product updated successfully" });
      } catch (error) {
        res.status(500).json({ message: "Error updating product", error });
      }
    });
    // All products show api here.(report)
    app.get("/products-report", async (req, res) => {
      const { category } = req.query;

      try {
        let query = {};

        if (category) {
          query.productCategory = category;
        }

        const products = await productCollections.find(query).toArray();
        res.json(products);
      } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).send("Server Error");
      }
    });

    // Add Customer route here:
    app.post('/add-customer', async (req, res) => {
      try {
        const { customerName, mobile } = req.body;
        const existingCustomer = await customerCollections.findOne({ customerName, mobile });

        if (existingCustomer) {
          const updateResult = await customerCollections.updateOne(
            { customerName, mobile },
            { $set: { ...req.body, updateDate: new Date() } }
          );
          res.status(200).json({ message: 'Customer data updated successfully', updatedCustomer: updateResult });
        } else {
          const customerData = {
            ...req.body
          };
          const result = await customerCollections.insertOne(customerData);
          res.status(201).json({ message: 'Customer added successfully', productId: result.insertedId });
        }
      } catch (error) {
        console.error('Error adding/updating customer:', error);
        res.status(500).json({ message: 'Failed to add or update customer', error });
      }
    });

    // Fetch customers for table data show.
    app.get("/customers", async (req, res) => {
      try {
        // Fetch customers and sort them by creationDate in descending order
        const customers = await customerCollections.find({}).sort({ creationDate: -1 }).toArray();
        res.status(200).json(customers);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch customers" });
      }
    });
    // Fetch product info for table data show.
    app.get("/product-info", async (req, res) => {
      try {
        // Fetch customers and sort them by creationDate in descending order
        const products = await productCollections.find({}).sort({ creationDate: -1 }).toArray();
        res.status(200).json(products);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch products info" });
      }
    });

    //  stock qty change api here
    app.put("/product-info/:id", async (req, res) => {
      const { id } = req.params;
      const { newStock } = req.body;

      try {
        const result = await productCollections.updateOne(
          { _id: new ObjectId(id) },
          { $set: { productQty: newStock } }
        );

        if (result.modifiedCount > 0) {
          res.status(200).json({ message: "Product stock updated successfully" });
        } else {
          res.status(404).json({ message: "Product not found or no changes made" });
        }
      } catch (error) {
        console.error("Error updating product stock:", error);
        res.status(500).json({ error: "Failed to update product stock" });
      }
    });


    // product table data delete api's here.
    app.delete("/customers/:id", async (req, res) => {
      const customer = req.params.id;
      // console.log(productId)

      try {
        const result = await customerCollections.deleteOne({ _id: new ObjectId(customer) });

        if (result.deletedCount === 1) {
          res.json({ message: "customer deleted successfully" });
        } else {
          res.status(404).json({ message: "customer not found" });
        }
      } catch (error) {
        res.status(500).json({ message: "Error deleting customer", error });
      }
    });

    //  sales data api here
    // app.post('/sales', async (req, res) => {
    //   try {
    //     const { customerName, mobile, products, due } = req.body;

    //     const existingCustomer = await salesCollections.findOne({ customerName, mobile });

    //     if (existingCustomer) {
    //       const updatedProducts = [...existingCustomer.products, ...products]; 

    //       const updatedDue = existingCustomer.due + due;

    //       const updateResult = await salesCollections.updateOne(
    //         { customerName, mobile }, 
    //         {
    //           $set: {
    //             products: updatedProducts,
    //             due: updatedDue, 
    //             updatedDate: new Date(), 
    //           },
    //         }
    //       );

    //       res.status(200).json({ message: 'Customer sales info updated successfully', productId: existingCustomer._id });
    //     } else {
    //       const salesData = {
    //         ...req.body,
    //         creationDate: new Date(), 
    //       };

    //       const result = await salesCollections.insertOne(salesData);

    //       res.status(201).json({ message: 'Sales info added successfully', productId: result.insertedId });
    //     }
    //   } catch (error) {
    //     console.error('Error adding/updating sales info:', error);
    //     res.status(500).json({ message: 'Failed to add/update sales info', error });
    //   }
    // });


    // zahid
    // app.post('/changeable', async (req, res) => {
    //   const salseData = req.body;
    //   const {
    //     subtotal, discount, vat, transport, totalAmount, cashPaid, totaldue: due, products, customerId
    //   } = salseData;

    //   const updateData = {
    //     subtotal,
    //     discount,
    //     vat,
    //     transport,
    //     totalAmount,
    //     cashPaid,
    //     due,
    //     products,
    //     customerId
    //   };

    //     const userUpdate = await customerCollections.findOneAndUpdate(
    //       { _id: new ObjectId(customerId) },
    //       { $set: { totalDue: due } },
    //       { returnOriginal: false }
    //     );

    //     if (!userUpdate.value) {
    //       return res.status(404).send({ message: "Customer not found" });
    //     }

    //     console.log("User due update", userUpdate);

    //     // Insert the sales data into salesCollections
    //     const saleProducts = await salesCollections.insertOne(updateData);
    //     res.send({ message: "Products updated successfully", saleProducts });

    // });

    // this is right - zahid::: -7:10 pm
    app.post('/changeable', async (req, res) => {
      const salesData = req.body;
      const {
        subtotal, discount, date, vat, transport, totalAmount, cashPaid, totaldue: due, products, customerId, ...customerData
      } = salesData;

      const updateData = {
        subtotal,
        discount,
        vat,
        date,
        transport,
        totalAmount,
        cashPaid,
        due,
        products,
        customerId,
        customerData
      };

      try {
        // Update totalDue in customerCollections
        const userUpdate = await customerCollections.findOneAndUpdate(
          { _id: new ObjectId(customerId) },
          { $set: { totalDue: due } },
          { returnDocument: 'after' }
        );

        console.log("User due updated:", userUpdate.value);

        // Insert the sales data into salesCollections
        const saleProducts = await salesCollections.insertOne(updateData);
        res.status(200).send(saleProducts);

      } catch (error) {
        console.error("Error in processing request:", error);
        res.status(500).json({ message: "Failed to process request", error });
      }
    });


    // customer paymented data delete
    app.delete('/paid-data-delete/:id', async (req, res) => {
      const { id } = req.params;
      try {
        const result = await salesCollections.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 0) {
          return res.status(404).json({ message: 'Item not found' });
        }
        res.json({ message: 'Item deleted successfully' });
      } catch (error) {
        res.status(500).json({ message: 'Error deleting item', error });
      }
    });


    // Fetch customers info for table data show. ::: zahid
    app.get("/customers-info", async (req, res) => {
      try {
        const products = await salesCollections.find().toArray();
        res.status(200).send(products);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch products info" });
      }
    });

    // customer details ::: zahid - 
    app.get("/customers-info/:id", async (req, res) => {
      const { id } = req.params;
      try {
        const products = await salesCollections.findOne({ _id: new ObjectId(id) })
        res.status(200).send(products);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch products info" });
      }
    });

    // pay ammount
    app.put("/customer-pay/:id", async (req, res) => {
      const { id } = req.params;
      const { data } = req.body;
      const { payammount, paidDate, previousDue } = data;

      try {
        const customer = await salesCollections.findOne({ _id: new ObjectId(id) });

        // Check if the customer exists
        if (!customer) {
          return res.status(404).json({ message: "Customer not found" });
        }

        // Calculate the new totalDue (use `customer.due`)
        const updatedTotalDue = customer.due - Number(payammount);

        // Ensure totalDue doesn't go negative
        const newTotalDue = updatedTotalDue < 0 ? 0 : updatedTotalDue;

        const paymentRecord = { payammount, paidDate, previousDue };

        const filter = { _id: new ObjectId(id) };
        const updatedUser = {
          $set: { due: newTotalDue },
          $push: { customerPayments: paymentRecord }, // Add the payment to the payments array
        };

        // Update the totalDue and add payment record in the database
        const result = await salesCollections.updateOne(filter, updatedUser);

        res.status(200).json({ message: "Updated successfully", result });
      } catch (error) {
        res.status(500).json({ message: "Error updating payment", error });
      }
    });



    // Fetch all sales info for table data show.
    app.get("/all-sales-data/:id", async (req, res) => {
      try {
        const query = req.params
        console.log("inviice", query);
        const products = await salesCollections.findOne({ _id: new ObjectId(query) });
        res.status(200).json(products);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch products info" });
      }
    });

    // create products
    app.post('/company-products', async (req, res) => {
      try {
        const productsBuy = req.body;

        const result = await productsBuyCollections.insertOne(productsBuy);

        res.status(201).json({
          message: 'Data inserted successfully', result
        });
      } catch (error) {
        console.error('Error inserting data:', error);
        res.status(500).json({ error: 'Failed to insert data' });
      }
    });

    // purchase report show 
    app.get('/purchase-report', async (req, res) => {
      try {
        // Fetch all purchase data
        const purchases = await productsBuyCollections.find({}).toArray();
        // Send the processed data back as JSON
        res.json(purchases);
      } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
      }
    });

    // products buy report that show in company buy page
    app.get('/company-buy-report', async (req, res) => {
      try {
        // Fetch all purchase data
        const purchases = await productsBuyCollections.find({}).toArray();
        // Send the processed data back as JSON
        res.json(purchases);
      } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
      }
    });

    // single data purchase details page
    app.get('/single-product-report/:id', async (req, res) => {
      try {
        const { id } = req.params;
        const data = await productsBuyCollections.findOne({ _id: new ObjectId(id) })
        res.status(200).send(data)
      } catch (error) {
        res.json({ messages: "have data send problems" });
      }
    })

    app.put("/customers/:id", async (req, res) => {
      const { id } = req.params;
      const due = req.body;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };

      const updatedUser = {
        $set: {
          totalDue: due.remainAmount
        }
      }
      console.log(due)

      const result = await customerCollections.updateOne(filter, updatedUser, options);

    });

    // update pay amount
    const { ObjectId } = require('mongodb');

    app.put('/update-pay-amount/:id', async (req, res) => {
      const { id } = req.params;
      const { payAmount, date } = req.body;

      try {
        // Find the existing record
        const existingData = await productsBuyCollections.findOne({ _id: new ObjectId(id) });
        if (!existingData) {
          return res.status(404).json({ message: 'Product not found' });
        }

        // Calculate the new moneyGiven value
        const newMoneyGiven = parseFloat(existingData.moneyGiven) + parseFloat(payAmount);

        // Create a new payment record
        const newPaymentRecord = {
          amount: parseFloat(payAmount),
          date
        };

        // Append the new payment record to serilalPay array (create the array if it doesn't exist)
        const updatedSerilalPay = existingData.serilalPay ? [...existingData.serilalPay, newPaymentRecord] : [newPaymentRecord];

        // Update the record in the database
        await productsBuyCollections.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              moneyGiven: newMoneyGiven,
              serilalPay: updatedSerilalPay,
            },
          }
        );

        // Send a success response
        res.status(200).json({
          message: 'Payment updated successfully',
          updatedData: {
            moneyGiven: newMoneyGiven,
            serilalPay: updatedSerilalPay,
          },
        });
      } catch (error) {
        console.error('Error updating payment:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    });


    app.put('/payment-update/:id', async (req, res) => {
      const { id } = req.params;
      const { payableMoney, moneyGiven, date } = req.body;

      try {
        const existingData = await productsBuyCollections.findOne({ _id: new ObjectId(id) });
        if (!existingData) {
          return res.status(404).json({ message: 'Product not found' });
        }

        const updateMoneyGiven = parseInt(existingData.moneyGiven) + parseInt(moneyGiven);
        const updatePayableMoney = parseInt(existingData.payableMoney) + parseInt(payableMoney);

        const retult = await productsBuyCollections.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              moneyGiven: updateMoneyGiven,
              payableMoney: updatePayableMoney,
              date: date,
            },
          }
        );
        // Send a success response
        res.status(200).send(retult)
      } catch (error) {
        res.status(200).json({ message: 'Payment updated failed' });
      }
    })


    // try {
    //   const existingData = await productsBuyCollections.findOne({ _id: new ObjectId(id) });

    //   if (!existingData) {
    //     return res.status(404).json({ message: 'Product not found' });
    //   }

    //   const newMoneyGiven = parseFloat(existingData.moneyGiven) + parseFloat(body.payAmount);

    //   const updatedData = await productsBuyCollections.findOneAndUpdate(
    //     { _id: new ObjectId(id) },
    //     { $set: { moneyGiven: newMoneyGiven, ...body }},
    //     { new: true } 
    //   );

    //   res.status(200).json({ message: 'Money given updated successfully', updatedData });

    // } catch (error) {
    //   console.error('Error updating the pay amount:', error);
    //   res.status(500).json({ message: 'Internal Server Error' });
    // }


    // Admin home page api's here........
    app.get('/api/dashboard-counts', async (req, res) => {
      try {
        const userCount = await userCollections.estimatedDocumentCount();
        const productCount = await productCollections.estimatedDocumentCount();
        const customerCount = await customerCollections.estimatedDocumentCount();
        const salesCount = await salesCollections.estimatedDocumentCount();
        const productsBuyCount = await productsBuyCollections.estimatedDocumentCount();
        res.send({
          userCount,
          productCount,
          customerCount,
          salesCount,
          productsBuyCount,
        });
      } catch (error) {
        console.error('Error fetching counts:', error);
        res.status(500).json({ message: 'Error fetching counts' });
      }
    });



    // All sales report show here........
    app.get('/sales-report', async (req, res) => {
      try {
        const salesData = await salesCollections.find({}).toArray();
        res.json(salesData);
      } catch (error) {
        console.error("Error fetching sales data:", error);
        res.status(500).send("Error fetching sales data");
      }
    });


    // nagad slase re
    app.post('/nagad-sale', async (req, res) => {
      const body = req.body;
      try {
        const nagadSale = await nagadSalesCollections.insertOne(body);
        res.send(nagadSale);
      } catch (error) {
        res.send({ message: 'there have problems' })
      }
    })

    // nagad sale
    app.get("/nagad-sale-report", async (req, res) => {
      try {

        // Fetch documents from the collection
        const documents = await nagadSalesCollections.find().toArray();

        // Format the data for the frontend
        const formattedData = documents.map((item, index) => ({
          sl: index + 1,
          date: item.date,
          customerName: item.customerData.customerName,
          products: item.products
            .map((product) => `${product.product} (x${product.qty})`)
            .join(", "),
          address: item.customerData.address,
          mobile: item.customerData.mobile,
          due: item.due,
          totalPrice: item.totalAmount,
        }));

        res.json(formattedData);
      } catch (error) {
        console.error("Error fetching data:", error);
        res.status(500).json({ message: "Failed to fetch data" });
      }
    });


    // stats page
    //   app.get('/calculate-totals', async (req, res) => {
    //     try {
    //         // Fetch all data from the collection
    //       const data1 = await salesCollections.find({}).toArray();
    //       const data2 = await nagadSalesCollections.find({},{ projection: { payments: 1, _id: 0 } }).toArray();

    //       const data2Payment = data2.map((item) =>item.payments)

    //       // Combine data from both collections
    //       const combinedData = [...data1, ...data2Payment];

    //       // Initialize totals
    //       let totalSale = 0;
    //       let nagad = 0;
    //       let due = 0;

    //         // Aggregate the totals
    //         combinedData.forEach(entry => {
    //             totalSale += parseInt(entry.totalAmount) || 0;
    //             nagad += parseInt(entry.cashPaid) || 0;
    //             due += (parseInt(entry.totalAmount) || 0) - (parseInt(entry.cashPaid) || 0);
    //         });

    //         // Send response
    //         res.json({
    //             totalSale,
    //             nagad,
    //             due,
    //         });
    //     } catch (error) {
    //         console.error('Error fetching data:', error);
    //         res.status(500).json({ error: 'Internal Server Error' });
    //     }
    // });

    // app.get('/calculate-totals', async (req, res) => {
    // const { startDate, endDate } = req.query;
    // let query = {};

    // if (startDate && endDate) {
    //     query = {
    //         "date": {
    //             $gte: startDate,
    //             $lte: endDate,
    //         },
    //     };
    //     console.log("the query is",query);
    // }

    //   try {
    //     // Fetch data from both collections based on query
    //     const data1 = await salesCollections.find(query).toArray();
    //     const data2 = await nagadSalesCollections
    //       .find(query, { projection: { payments: 1, _id: 0 } })
    //       .toArray();

    //       console.log(data2);
        
    //     const data2date = data2.map((item) => item.payments)
        
    //     // Combine and process data manually
    //     const allPayments = [
    //       ...data1,
    //       ... data2date,
    //     ];

      

    //     // Calculate totals
    //     const totals = allPayments.reduce(
    //       (acc, payment) => {
    //         acc.totalSale += parseFloat(payment.totalAmount || 0);
    //         acc.nagad += parseFloat(payment.cashPaid || 0);
    //         acc.due += parseFloat(payment.due || 0);
    //         return acc;
    //       },
    //       { totalSale: 0, nagad: 0, due: 0 }
    //     );
    //     res.json(totals);
    //   } catch (error) {
    //     console.error(error);
    //     res.status(500).json({ error: 'Internal Server Error' });
    //   }
    // });


    app.get('/calculate-totals', async (req, res) => {
      const { startDate, endDate } = req.query;
      let query = {};
  
      if (startDate && endDate) {
          query = {
              date: {
                  $gte: startDate,
                  $lte: endDate,
              },
          };
          console.log('The query is:', query);
      }
  
      try {
          // Fetch data from both collections based on query
          const data1 = await salesCollections.find(query).toArray();
          const data2 = await nagadSalesCollections.find(query).toArray();
  
          // Combine and process data
          const allPayments = [...data1, ...data2];
  
          // Calculate totals
          const totals = allPayments.reduce(
              (acc, payment) => {
                  acc.totalSale += parseFloat(payment.totalAmount || 0);
                  acc.nagad += parseFloat(payment.cashPaid || 0);
                  acc.due += parseFloat(payment.due || 0);
                  return acc;
              },
              { totalSale: 0, nagad: 0, due: 0 }
          );
  
          res.json(totals);
      } catch (error) {
          console.error(error);
          res.status(500).json({ error: 'Internal Server Error' });
      }
  });


  



  } finally {

  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('server is running on pos-soft')
})

app.listen(port, () => {
  console.log(`pos-soft server is running on ${port}`)
})
