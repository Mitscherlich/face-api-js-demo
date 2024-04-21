import {
  TinyFaceDetectorOptions,
  createCanvasFromMedia,
  detectAllFaces,
  draw,
  loadAgeGenderModel,
  loadFaceExpressionModel,
  loadFaceLandmarkTinyModel,
  loadTinyFaceDetectorModel,
  resizeResults,
} from 'face-api.js'

const $app = document.querySelector('#app')
const $source = document.querySelector('#source')
const $form = document.querySelector('form')

async function get_camera() {
  try {
    const mediaSource = await navigator.mediaDevices.getUserMedia({ video: true })
    $source.srcObject = mediaSource
  }
  catch (e) {
    console.error(e)
  }
}

function get_options() {
  const formData = new FormData($form)
  const showLandmarks = formData.get('show_landmarks') === 'on'
  const showExpression = formData.get('show_expression') === 'on'
  const showAgeAndGender = formData.get('show_age_and_gender') === 'on'
  return { showLandmarks, showExpression, showAgeAndGender }
}

const MODEL_PATH = '/face-api-models'
function load_models() {
  return Promise.all([
    loadTinyFaceDetectorModel(MODEL_PATH),
    loadFaceLandmarkTinyModel(MODEL_PATH),
    loadFaceExpressionModel(MODEL_PATH),
    loadAgeGenderModel(MODEL_PATH),
  ])
}

function detect_face(e) {
  const media = e.target || $source
  const canvas = createCanvasFromMedia(media)
  const ctx = canvas.getContext('2d')
  const [{ width, height }] = media.getClientRects()

  $app.append(canvas)

  let detectionsPromise = null
  const _detect = async () => {
    const { showLandmarks, showExpression, showAgeAndGender } = get_options()
    if (!detectionsPromise) {
      detectionsPromise = detectAllFaces(media, new TinyFaceDetectorOptions())
      if (showLandmarks)
        detectionsPromise = detectionsPromise.withFaceLandmarks(true)
      if (showExpression)
        detectionsPromise = detectionsPromise.withFaceExpressions()
      if (showAgeAndGender)
        detectionsPromise = detectionsPromise.withAgeAndGender()
    }

    try {
      const detections = await detectionsPromise
      const resizedDetections = resizeResults(detections, { width, height })
      ctx.clearRect(0, 0, width, height)
      draw.drawDetections(canvas, resizedDetections)
      showLandmarks && draw.drawFaceLandmarks(canvas, resizedDetections)
      showExpression && draw.drawFaceExpressions(canvas, resizedDetections)
      if (showAgeAndGender) {
        resizedDetections.forEach((result) => {
          const { age, gender, genderProbability } = result
          const textField = new draw.DrawTextField([
            `${~~age} years`,
            `${gender} (${genderProbability.toFixed(1)})`,
          ], result.detection.box.bottomRight)
          textField.draw(canvas)
        })
      }
      requestAnimationFrame(_detect)
    }
    finally {
      detectionsPromise = null
    }
  }

  requestAnimationFrame(_detect)
}
$source.addEventListener('play', detect_face)

load_models().then(get_camera)
