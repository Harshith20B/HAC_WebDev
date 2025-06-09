// const { GoogleGenerativeAI } = require("@google/generative-ai");

// const apiKey = "AIzaSyDq7PsSXFn_VSoie2Ri5OawMTRUaR-chTY"; // Your actual API key

// async function generateItinerary() {
//   const landmarks = [
//     { name: "Eiffel Tower", lat: 48.8584, lng: 2.2945 },
//     { name: "Louvre Museum", lat: 48.8606, lng: 2.3376 },
//     { name: "Notre-Dame Cathedral", lat: 48.853, lng: 2.3499 },
//     { name: "Arc de Triomphe", lat: 48.8738, lng: 2.295 },
//     { name: "Montmartre", lat: 48.8867, lng: 2.3431 }
//   ];

//   const mustSee = [0, 1]; // Eiffel Tower, Louvre
//   const numDays = 3;
//   const budget = 800; // USD per person
//   const city = "Paris";

//   // Much shorter, focused prompt to avoid token limits
//   const userPrompt = `Create a ${numDays}-day ${city} itinerary, $${budget} budget.

// Must visit: ${mustSee.map(i => landmarks[i].name).join(", ")}
// Other options: ${landmarks.slice(2).map(l => l.name).join(", ")}

// Format as valid JSON only, no extra text:
// {
//   "days": [
//     {"day": 1, "morning": "Place (cost)", "afternoon": "Place (cost)", "evening": "Place (cost)"}
//   ],
//   "hotels": [{"name": "Hotel", "price": 70}],
//   "transport": {"daily": 7.5, "total": 23},
//   "summary": {"accommodation": 210, "food": 180, "attractions": 80, "transport": 23, "total": 493}
// }

// Keep under 500 tokens. JSON only.`;

//   try {
//     const genAI = new GoogleGenerativeAI(apiKey);
    
//     // Use most efficient settings for free tier
//     const model = genAI.getGenerativeModel({ 
//       model: "gemini-1.5-flash",
//       generationConfig: {
//         temperature: 0.1, // Lower for more consistent JSON
//         maxOutputTokens: 512, // Reduced significantly
//         topP: 0.7,
//       }
//     });

//     console.log("🔄 Generating compact travel itinerary...");
//     console.log(`📍 ${city} • 📅 ${numDays} days • 💰 $${budget}`);
//     console.log("⏳ Please wait...\n");
    
//     // Add delay for rate limits
//     await new Promise(resolve => setTimeout(resolve, 1000));

//     const result = await model.generateContent({
//       contents: [{
//         parts: [{ text: userPrompt }]
//       }]
//     });

//     const responseText = result.response.text();
//     console.log("✅ Raw Response:");
//     console.log("=" .repeat(30));
//     console.log(responseText);
//     console.log("=" .repeat(30));
    
//     // Extract and parse JSON more reliably
//     try {
//       // Clean the response - remove markdown formatting if present
//       let cleanResponse = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
//       // Find JSON object
//       const jsonStart = cleanResponse.indexOf('{');
//       const jsonEnd = cleanResponse.lastIndexOf('}') + 1;
      
//       if (jsonStart !== -1 && jsonEnd > jsonStart) {
//         const jsonStr = cleanResponse.substring(jsonStart, jsonEnd);
//         const itinerary = JSON.parse(jsonStr);
        
//         console.log("\n📋 PARSED ITINERARY:");
//         console.log("=" .repeat(30));
        
//         // Display days
//         if (itinerary.days) {
//           itinerary.days.forEach(day => {
//             console.log(`\n📅 Day ${day.day}:`);
//             console.log(`  🌅 Morning: ${day.morning || 'Not specified'}`);
//             console.log(`  🌞 Afternoon: ${day.afternoon || 'Not specified'}`);
//             console.log(`  🌆 Evening: ${day.evening || 'Not specified'}`);
//           });
//         }
        
//         // Display summary
//         if (itinerary.summary) {
//           console.log(`\n💰 BUDGET BREAKDOWN:`);
//           Object.entries(itinerary.summary).forEach(([key, value]) => {
//             console.log(`  ${key}: $${value}`);
//           });
//         }
        
//         // Display hotels
//         if (itinerary.hotels) {
//           console.log(`\n🏨 HOTEL OPTIONS:`);
//           itinerary.hotels.forEach(hotel => {
//             console.log(`  ${hotel.name}: $${hotel.price}/night`);
//           });
//         }
        
//         // Save to file
//         const fs = require('fs');
//         const filename = `paris_compact_${Date.now()}.json`;
//         fs.writeFileSync(filename, JSON.stringify(itinerary, null, 2));
//         console.log(`\n💾 Saved to: ${filename}`);
        
//         return itinerary;
        
//       } else {
//         throw new Error('No valid JSON found in response');
//       }
//     } catch (parseErr) {
//       console.log("\n⚠️ JSON parsing failed:", parseErr.message);
//       console.log("Raw response saved for debugging");
      
//       // Save raw response for debugging
//       const fs = require('fs');
//       const filename = `debug_response_${Date.now()}.txt`;
//       fs.writeFileSync(filename, responseText);
//       console.log(`💾 Debug file: ${filename}`);
//     }
    
//   } catch (err) {
//     console.error("❌ Error:", err.message);
    
//     // Handle specific API errors
//     if (err.message.includes('429')) {
//       console.error("\n🚫 Rate limit exceeded. Wait 60 seconds and try again.");
//     } else if (err.message.includes('400')) {
//       console.error("\n⚠️ Request format issue. Check prompt length.");
//     } else if (err.message.includes('403')) {
//       console.error("\n🔑 API key issue. Verify key is valid and has quota.");
//     }
    
//     throw err;
//   }
// }

// // Alternative: Generate day-by-day to avoid token limits
// async function generateDayByDay() {
//   const results = { days: [], hotels: [], transport: {}, summary: {} };
  
//   for (let day = 1; day <= 3; day++) {
//     const dayPrompt = `Day ${day} Paris itinerary. JSON only:
// {"day": ${day}, "morning": "Place ($cost)", "afternoon": "Place ($cost)", "evening": "Place ($cost)"}`;

//     try {
//       const genAI = new GoogleGenerativeAI(apiKey);
//       const model = genAI.getGenerativeModel({ 
//         model: "gemini-1.5-flash",
//         generationConfig: {
//           temperature: 0.1,
//           maxOutputTokens: 128,
//           topP: 0.7,
//         }
//       });

//       console.log(`🔄 Generating Day ${day}...`);
//       await new Promise(resolve => setTimeout(resolve, 2000)); // Rate limit
      
//       const result = await model.generateContent(dayPrompt);
//       const responseText = result.response.text();
      
//       // Parse day response
//       const cleanResponse = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
//       const dayData = JSON.parse(cleanResponse);
//       results.days.push(dayData);
      
//       console.log(`✅ Day ${day} complete`);
      
//     } catch (err) {
//       console.error(`❌ Day ${day} failed:`, err.message);
//       // Continue with other days
//     }
//   }
  
//   // Add basic hotel and transport info
//   results.hotels = [
//     {"name": "Generator Paris", "price": 80},
//     {"name": "HotelF1 Paris", "price": 50}
//   ];
//   results.transport = {"daily": 7.5, "3day": 22};
//   results.summary = {"accommodation": 240, "transport": 25, "attractions": 100, "food": 180, "total": 545};
  
//   console.log("\n📋 COMPLETE ITINERARY:");
//   console.log(JSON.stringify(results, null, 2));
  
//   // Save final result
//   const fs = require('fs');
//   const filename = `paris_dayby_${Date.now()}.json`;
//   fs.writeFileSync(filename, JSON.stringify(results, null, 2));
//   console.log(`💾 Saved complete itinerary: ${filename}`);
  
//   return results;
// }

// // Main execution with fallback
// async function main() {
//   console.log("🌍 Token-Optimized Travel Planner");
//   console.log("================================");
//   console.log("✓ Reduced token usage");
//   console.log("✓ JSON-only responses");
//   console.log("✓ Fallback day-by-day generation");
//   console.log("✓ Better error handling\n");

//   try {
//     // Try main approach first
//     console.log("🎯 Attempting single request...");
//     await generateItinerary();
//   } catch (err) {
//     console.log("\n🔄 Fallback: Generating day-by-day...");
//     try {
//       await generateDayByDay();
//     } catch (fallbackErr) {
//       console.error("❌ Both methods failed:", fallbackErr.message);
//     }
//   }
// }

// // Run with better error handling
// main().catch(console.error);