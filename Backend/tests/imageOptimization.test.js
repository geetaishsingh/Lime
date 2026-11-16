import sharp from "sharp";
import { OPTIMIZATION_PRESETS, isCloudinaryConfigured } from "../config/cloudinary.js";
import { compressImage, validateImageSignature } from "../utils/compressImage.js";
import { uploadToCloudinary, deleteFromCloudinary, cleanupCloudinaryOnFailure } from "../utils/uploadToCloudinary.js";
import { getOptimizedImageUrl, getThumbnailUrl, getBlurPlaceholderUrl } from "../utils/getOptimizedImage.js";

async function runTests() {
  let passedTests = 0;
  let totalTests = 10;

  // TEST 1: JPEG Upload & WebP Conversion
  try {
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
    if (
      res1.info.format === "webp" &&
      res1.info.width <= 1600 &&
      res1.info.height <= 1600 &&
      res1.info.size < res1.originalSize
    ) {
      passedTests++;
    } else {
      console.error("❌ TEST 1 FAILED: Unexpected format or size.\n");
    }
  } catch (err) {
    console.error("❌ TEST 1 FAILED:", err.message);
  }

  // TEST 2: PNG Upload & WebP Conversion with Profile Preset (512x512, q:45)
  try {
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
    if (
      res2.info.format === "webp" &&
      res2.info.width <= 512 &&
      res2.info.height <= 512
    ) {
      passedTests++;
    } else {
      console.error("❌ TEST 2 FAILED\n");
    }
  } catch (err) {
    console.error("❌ TEST 2 FAILED:", err.message);
  }

  // TEST 3: WebP Upload & Chat Preset (1280x1280, q:50)
  try {
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
    if (res3.info.width <= 1280 && res3.info.height <= 1280) {
      passedTests++;
    } else {
      console.error("❌ TEST 3 FAILED\n");
    }
  } catch (err) {
    console.error("❌ TEST 3 FAILED:", err.message);
  }

  // TEST 4: Large Image Compression & Cover Preset (1600x600, q:55)
  try {
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
    if (res4.info.width <= 1600 && res4.info.height <= 600) {
      passedTests++;
    } else {
      console.error("❌ TEST 4 FAILED\n");
    }
  } catch (err) {
    console.error("❌ TEST 4 FAILED:", err.message);
  }

  // TEST 5: Invalid File & Malicious Signature Rejection
  try {
    const fakeBuffer = Buffer.from("<html><script>alert('malicious')</script></html>");
    const detected = validateImageSignature(fakeBuffer);

    let rejected = false;
    try {
      await compressImage(fakeBuffer, "post");
    } catch (_expectedError) {
      rejected = true;
    }

    if (detected === null && rejected) {
      passedTests++;
    } else {
      console.error("❌ TEST 5 FAILED: Failed to reject invalid file.\n");
    }
  } catch (err) {
    console.error("❌ TEST 5 FAILED:", err.message);
  }

  // TEST 6: Multiple Image Upload in Parallel
  try {
    const buffers = await Promise.all([
      sharp({ create: { width: 1000, height: 800, channels: 3, background: { r: 255, g: 0, b: 0 } } }).jpeg().toBuffer(),
      sharp({ create: { width: 1200, height: 900, channels: 3, background: { r: 0, g: 255, b: 0 } } }).jpeg().toBuffer(),
      sharp({ create: { width: 800, height: 1100, channels: 3, background: { r: 0, g: 0, b: 255 } } }).jpeg().toBuffer(),
    ]);

    const results = await Promise.all(buffers.map((b) => compressImage(b, "post")));
    if (results.every((r) => r.info.format === "webp" && r.info.size < r.originalSize)) {
      passedTests++;
    } else {
      console.error("❌ TEST 6 FAILED\n");
    }
  } catch (err) {
    console.error("❌ TEST 6 FAILED:", err.message);
  }

  // TEST 7: Optimization Presets Verification
  try {
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
      passedTests++;
    } else {
      console.error("❌ TEST 7 FAILED: Preset settings mismatched.\n");
    }
  } catch (err) {
    console.error("❌ TEST 7 FAILED:", err.message);
  }

  // TEST 8: Cloudinary Metadata & URL Transformation Delivery
  try {
    const sampleUrl = "https://res.cloudinary.com/gzkwurpy/image/upload/v123456/lime/posts/sample.webp";
    const optimizedUrl = getOptimizedImageUrl(sampleUrl);
    const thumbUrl = getThumbnailUrl(sampleUrl, 400);
    const blurUrl = getBlurPlaceholderUrl(sampleUrl);

    if (
      optimizedUrl.includes("f_auto,q_auto") &&
      thumbUrl.includes("w_400,h_400,c_fill") &&
      blurUrl.includes("e_blur:1000")
    ) {
      passedTests++;
    } else {
      console.error("❌ TEST 8 FAILED\n");
    }
  } catch (err) {
    console.error("❌ TEST 8 FAILED:", err.message);
  }

  // TEST 9: Image Deletion & Default Avatar Protection
  try {
    const defaultAvatarUrl = "https://ui-avatars.com/api/?name=Lime+User&background=10b981&color=fff&size=256";
    const wasDeleted = await deleteFromCloudinary(defaultAvatarUrl);

    if (wasDeleted === false) {
      passedTests++;
    } else {
      console.error("❌ TEST 9 FAILED: Default avatar was not protected.\n");
    }
  } catch (err) {
    console.error("❌ TEST 9 FAILED:", err.message);
  }

  // TEST 10: Upload Failure & Cleanup Resilience
  try {
    // Test that cleanupCloudinaryOnFailure handles empty or invalid IDs without throwing
    await cleanupCloudinaryOnFailure(["non_existent_test_id_12345", null, ""]);
    passedTests++;
  } catch (err) {
    console.error("❌ TEST 10 FAILED:", err.message);
  }

  process.exit(passedTests === totalTests ? 0 : 1);
}

runTests();
