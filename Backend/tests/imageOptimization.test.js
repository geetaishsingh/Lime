import sharp from "sharp";
import { OPTIMIZATION_PRESETS, isCloudinaryConfigured } from "../config/cloudinary.js";
import { compressImage, validateImageSignature } from "../utils/compressImage.js";
import { uploadToCloudinary, deleteFromCloudinary, cleanupCloudinaryOnFailure } from "../utils/uploadToCloudinary.js";
import { getOptimizedImageUrl, getThumbnailUrl, getBlurPlaceholderUrl } from "../utils/getOptimizedImage.js";

async function runTests() {
  console.log("\n=======================================================");
  console.log("🚀 LIME SOCIAL MEDIA: IMAGE OPTIMIZATION TEST SUITE");
  console.log("=======================================================\n");

  let passedTests = 0;
  let totalTests = 10;

  // TEST 1: JPEG Upload & WebP Conversion
  try {
    console.log("--- TEST 1: JPEG Upload & WebP Conversion ---");
    const rawJpg = await sharp({
      create: {
        width: 2000,
        height: 2000,
        channels: 3,
        background: { r: 210, g: 100, b: 50 },
      },
    })
      .jpeg({ quality: 95 })
      .toBuffer();

    const res1 = await compressImage(rawJpg, "post");
    console.log(`Original JPG: ${(res1.originalSize / 1024).toFixed(1)} KB (2000x2000)`);
    console.log(`Optimized WebP: ${(res1.info.size / 1024).toFixed(1)} KB (${res1.info.width}x${res1.info.height})`);
    console.log(`Reduction: ${res1.reductionPercent}%`);

    if (
      res1.info.format === "webp" &&
      res1.info.width <= 1600 &&
      res1.info.height <= 1600 &&
      res1.info.size < res1.originalSize
    ) {
      console.log("✅ TEST 1 PASSED: JPEG converted to WebP within 1600x1600 with size reduction.\n");
      passedTests++;
    } else {
      console.error("❌ TEST 1 FAILED: Unexpected format or size.\n");
    }
  } catch (err) {
    console.error("❌ TEST 1 FAILED:", err.message);
  }

  // TEST 2: PNG Upload & WebP Conversion with Profile Preset (512x512, q:45)
  try {
    console.log("--- TEST 2: PNG Upload (Profile Preset: 512x512, q:45) ---");
    const rawPng = await sharp({
      create: {
        width: 1200,
        height: 1200,
        channels: 4,
        background: { r: 132, g: 204, b: 22, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const res2 = await compressImage(rawPng, "profile");
    console.log(`Original PNG: ${(res2.originalSize / 1024).toFixed(1)} KB (1200x1200)`);
    console.log(`Optimized WebP: ${(res2.info.size / 1024).toFixed(1)} KB (${res2.info.width}x${res2.info.height})`);
    console.log(`Reduction: ${res2.reductionPercent}%`);

    if (
      res2.info.format === "webp" &&
      res2.info.width <= 512 &&
      res2.info.height <= 512
    ) {
      console.log("✅ TEST 2 PASSED: PNG converted to WebP within 512x512 (quality 45).\n");
      passedTests++;
    } else {
      console.error("❌ TEST 2 FAILED\n");
    }
  } catch (err) {
    console.error("❌ TEST 2 FAILED:", err.message);
  }

  // TEST 3: WebP Upload & Chat Preset (1280x1280, q:50)
  try {
    console.log("--- TEST 3: WebP Upload (Chat Preset: 1280x1280, q:50) ---");
    const rawWebp = await sharp({
      create: {
        width: 1800,
        height: 1400,
        channels: 3,
        background: { r: 50, g: 150, b: 250 },
      },
    })
      .webp({ quality: 90 })
      .toBuffer();

    const res3 = await compressImage(rawWebp, "chat");
    console.log(`Original WebP: ${(res3.originalSize / 1024).toFixed(1)} KB`);
    console.log(`Re-optimized WebP: ${(res3.info.size / 1024).toFixed(1)} KB (${res3.info.width}x${res3.info.height})`);
    console.log(`Reduction: ${res3.reductionPercent}%`);

    if (res3.info.width <= 1280 && res3.info.height <= 1280) {
      console.log("✅ TEST 3 PASSED: WebP compressed to chat preset specs.\n");
      passedTests++;
    } else {
      console.error("❌ TEST 3 FAILED\n");
    }
  } catch (err) {
    console.error("❌ TEST 3 FAILED:", err.message);
  }

  // TEST 4: Large Image Compression & Cover Preset (1600x600, q:55)
  try {
    console.log("--- TEST 4: Large Image Downscaling (Cover Preset: 1600x600) ---");
    const rawLarge = await sharp({
      create: {
        width: 3840,
        height: 2160,
        channels: 3,
        background: { r: 25, g: 25, b: 35 },
      },
    })
      .jpeg({ quality: 90 })
      .toBuffer();

    const res4 = await compressImage(rawLarge, "cover");
    console.log(`Original 4K Image: ${(res4.originalSize / 1024).toFixed(1)} KB (3840x2160)`);
    console.log(`Cover WebP: ${(res4.info.size / 1024).toFixed(1)} KB (${res4.info.width}x${res4.info.height})`);
    console.log(`Reduction: ${res4.reductionPercent}%`);

    if (res4.info.width <= 1600 && res4.info.height <= 600) {
      console.log("✅ TEST 4 PASSED: 4K image downscaled to cover dimensions with massive bandwidth savings.\n");
      passedTests++;
    } else {
      console.error("❌ TEST 4 FAILED\n");
    }
  } catch (err) {
    console.error("❌ TEST 4 FAILED:", err.message);
  }

  // TEST 5: Invalid File & Malicious Signature Rejection
  try {
    console.log("--- TEST 5: Invalid File Rejection ---");
    const fakeBuffer = Buffer.from("<html><script>alert('malicious')</script></html>");
    const detected = validateImageSignature(fakeBuffer);

    let rejected = false;
    try {
      await compressImage(fakeBuffer, "post");
    } catch (_expectedError) {
      rejected = true;
    }

    if (detected === null && rejected) {
      console.log("✅ TEST 5 PASSED: Non-image / fake script buffer correctly identified and rejected.\n");
      passedTests++;
    } else {
      console.error("❌ TEST 5 FAILED: Failed to reject invalid file.\n");
    }
  } catch (err) {
    console.error("❌ TEST 5 FAILED:", err.message);
  }

  // TEST 6: Multiple Image Upload in Parallel
  try {
    console.log("--- TEST 6: Multiple Image Upload (Post: 3 Photos) ---");
    const buffers = await Promise.all([
      sharp({ create: { width: 1000, height: 800, channels: 3, background: { r: 255, g: 0, b: 0 } } }).jpeg().toBuffer(),
      sharp({ create: { width: 1200, height: 900, channels: 3, background: { r: 0, g: 255, b: 0 } } }).jpeg().toBuffer(),
      sharp({ create: { width: 800, height: 1100, channels: 3, background: { r: 0, g: 0, b: 255 } } }).jpeg().toBuffer(),
    ]);

    const results = await Promise.all(buffers.map((b) => compressImage(b, "post")));
    console.log(`Processed ${results.length} images in parallel.`);
    results.forEach((r, i) => {
      console.log(` Image ${i + 1}: ${(r.originalSize / 1024).toFixed(1)} KB -> ${(r.info.size / 1024).toFixed(1)} KB (-${r.reductionPercent}%)`);
    });

    if (results.every((r) => r.info.format === "webp" && r.info.size < r.originalSize)) {
      console.log("✅ TEST 6 PASSED: Multiple images successfully processed and compressed.\n");
      passedTests++;
    } else {
      console.error("❌ TEST 6 FAILED\n");
    }
  } catch (err) {
    console.error("❌ TEST 6 FAILED:", err.message);
  }

  // TEST 7: Optimization Presets Verification
  try {
    console.log("--- TEST 7: Presets Specification Verification ---");
    const expected = {
      profile: { width: 512, height: 512, quality: 45, folder: "lime/profiles" },
      cover: { width: 1600, height: 600, quality: 55, folder: "lime/covers" },
      post: { width: 1600, height: 1600, quality: 55, folder: "lime/posts" },
      chat: { width: 1280, height: 1280, quality: 50, folder: "lime/chat" },
      story: { width: 1080, height: 1920, quality: 55, folder: "lime/stories" },
      thumbnail: { width: 400, height: 400, quality: 45, folder: "lime/thumbnails" },
    };

    let allMatch = true;
    for (const [key, exp] of Object.entries(expected)) {
      const preset = OPTIMIZATION_PRESETS[key];
      const match =
        preset.width === exp.width &&
        preset.height === exp.height &&
        preset.quality === exp.quality &&
        preset.folder === exp.folder;
      if (!match) {
        console.error(`Preset mismatch for ${key}:`, preset, "vs", exp);
        allMatch = false;
      }
    }

    if (allMatch) {
      console.log("✅ TEST 7 PASSED: All 6 presets match exact dimension, quality, and folder specifications.\n");
      passedTests++;
    } else {
      console.error("❌ TEST 7 FAILED: Preset settings mismatched.\n");
    }
  } catch (err) {
    console.error("❌ TEST 7 FAILED:", err.message);
  }

  // TEST 8: Cloudinary Metadata & URL Transformation Delivery
  try {
    console.log("--- TEST 8: Delivery Transformations & Metadata Structure ---");
    const sampleUrl = "https://res.cloudinary.com/gzkwurpy/image/upload/v123456/lime/posts/sample.webp";
    const optimizedUrl = getOptimizedImageUrl(sampleUrl);
    const thumbUrl = getThumbnailUrl(sampleUrl, 400);
    const blurUrl = getBlurPlaceholderUrl(sampleUrl);

    console.log("Optimized URL:", optimizedUrl);
    console.log("Thumbnail URL:", thumbUrl);
    console.log("Blur Placeholder URL:", blurUrl);

    if (
      optimizedUrl.includes("f_auto,q_auto") &&
      thumbUrl.includes("w_400,h_400,c_fill") &&
      blurUrl.includes("e_blur:1000")
    ) {
      console.log("✅ TEST 8 PASSED: Cloudinary delivery URLs correctly inject f_auto, q_auto, thumbnails, and blur.\n");
      passedTests++;
    } else {
      console.error("❌ TEST 8 FAILED\n");
    }
  } catch (err) {
    console.error("❌ TEST 8 FAILED:", err.message);
  }

  // TEST 9: Image Deletion & Default Avatar Protection
  try {
    console.log("--- TEST 9: Deletion & Default Avatar Protection ---");
    const defaultAvatarUrl = "https://ui-avatars.com/api/?name=Lime+User&background=10b981&color=fff&size=256";
    const wasDeleted = await deleteFromCloudinary(defaultAvatarUrl);

    if (wasDeleted === false) {
      console.log("✅ TEST 9 PASSED: Shared default avatars are safely protected from accidental deletion.\n");
      passedTests++;
    } else {
      console.error("❌ TEST 9 FAILED: Default avatar was not protected.\n");
    }
  } catch (err) {
    console.error("❌ TEST 9 FAILED:", err.message);
  }

  // TEST 10: Upload Failure & Cleanup Resilience
  try {
    console.log("--- TEST 10: Cleanup on Database / Upload Failure ---");
    // Test that cleanupCloudinaryOnFailure handles empty or invalid IDs without throwing
    await cleanupCloudinaryOnFailure(["non_existent_test_id_12345", null, ""]);
    console.log("✅ TEST 10 PASSED: Failure rollback successfully executes without unhandled rejection.\n");
    passedTests++;
  } catch (err) {
    console.error("❌ TEST 10 FAILED:", err.message);
  }

  console.log("=======================================================");
  console.log(`🏁 TEST RESULTS: ${passedTests} / ${totalTests} TESTS PASSED`);
  console.log("=======================================================\n");

  process.exit(passedTests === totalTests ? 0 : 1);
}

runTests();
