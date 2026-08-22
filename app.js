// 전역 변수
let selectedFrame = null;
let selectedPhotos = [null, null, null, null]; // 4장의 사진
let photoTransforms = [
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 }
]; // 각 사진의 변환 정보 (이동만)
let savedPhotos = [];
let db = null; // IndexedDB 인스턴스
const DB_NAME = 'lifecutDB';
const DB_VERSION = 1;
const STORE_NAME = 'photos';

// DOM 요소
let frameSelectScreen, photoSelectScreen, resultScreen;
let frameList, photoSlots;
let frameBackgroundCanvas, frameBackgroundCtx;
let composeBtn, saveBtn, downloadBtn, newPhotoBtn, backToFrameBtn;
let resultCanvas, resultCtx;
let menuBtn, sideMenu, closeMenuBtn, gallery, savePopup, closePopupBtn;
let imageViewPopup, viewImage, closeImageViewBtn, downloadImageViewBtn;
let currentViewingPhoto = null;
let photoEditPopup, photoEditCanvas, photoEditCtx, currentEditIndex = -1;
let photoEditScale = 1, photoEditX = 0, photoEditY = 0;
let isDragging = false, dragStartX = 0, dragStartY = 0;

// 인생네컷 프레임 데이터
const frames = [
    {
        id: 1,
        name: 'Yourself Film',
        layout: {
            // 4개 구역의 위치와 크기 (비율 기준) - 2x2 그리드
            slots: [
                { x: 0.05, y: 0.05, width: 0.44, height: 0.42 }, // 좌상
                { x: 0.51, y: 0.05, width: 0.44, height: 0.42 }, // 우상
                { x: 0.05, y: 0.48, width: 0.44, height: 0.42 }, // 좌하
                { x: 0.51, y: 0.48, width: 0.44, height: 0.42 }  // 우하
            ],
            frameColor: '#808080', // 회색 테두리
            frameWidth: 15,
            slotColor: '#B3D9FF', // 연한 파란색 슬롯 배경
            bottomText: 'yourself film',
            title: ''
        }
    },
    {
        id: 2,
        name: 'Merry Christmas',
        layout: {
            // 4개 구역의 위치와 크기 (비율 기준) - 2x2 그리드
            slots: [
                { x: 0.05, y: 0.05, width: 0.44, height: 0.42 }, // 좌상
                { x: 0.51, y: 0.05, width: 0.44, height: 0.42 }, // 우상
                { x: 0.05, y: 0.48, width: 0.44, height: 0.42 }, // 좌하
                { x: 0.51, y: 0.48, width: 0.44, height: 0.42 }  // 우하
            ],
            frameColor: '#DC143C', // 크리스마스 빨간색
            frameWidth: 20,
            slotColor: '#FFFFFF', // 흰색 슬롯 배경
            bottomText: 'Merry Christmas',
            title: '🎄'
        }
    },
];

// DOM 요소 초기화
function initDOMElements() {
    // 화면
    frameSelectScreen = document.getElementById('frameSelectScreen');
    photoSelectScreen = document.getElementById('photoSelectScreen');
    resultScreen = document.getElementById('resultScreen');
    
    // 프레임 선택
    frameList = document.getElementById('frameList');
    if (!frameList) {
        console.error('frameList 요소를 찾을 수 없습니다.');
        return false;
    }
    
    // 사진 선택
    photoSlots = document.getElementById('photoSlots');
    frameBackgroundCanvas = document.getElementById('frameOverlayCanvas');
    if (frameBackgroundCanvas) {
        frameBackgroundCtx = frameBackgroundCanvas.getContext('2d');
    }
    composeBtn = document.getElementById('composeBtn');
    backToFrameBtn = document.getElementById('backToFrameBtn');
    
    // 결과
    resultCanvas = document.getElementById('resultCanvas');
    if (!resultCanvas) {
        console.error('resultCanvas 요소를 찾을 수 없습니다.');
        return false;
    }
    resultCtx = resultCanvas.getContext('2d');
    saveBtn = document.getElementById('saveBtn');
    downloadBtn = document.getElementById('downloadBtn');
    newPhotoBtn = document.getElementById('newPhotoBtn');
    
    // 메뉴
    menuBtn = document.getElementById('menuBtn');
    sideMenu = document.getElementById('sideMenu');
    closeMenuBtn = document.getElementById('closeMenuBtn');
    gallery = document.getElementById('gallery');
    savePopup = document.getElementById('savePopup');
    closePopupBtn = document.getElementById('closePopupBtn');
    
    // 이미지 보기 팝업
    imageViewPopup = document.getElementById('imageViewPopup');
    viewImage = document.getElementById('viewImage');
    closeImageViewBtn = document.getElementById('closeImageViewBtn');
    downloadImageViewBtn = document.getElementById('downloadImageViewBtn');
    
    // 사진 편집 팝업
    photoEditPopup = document.getElementById('photoEditPopup');
    photoEditCanvas = document.getElementById('photoEditCanvas');
    if (photoEditCanvas) {
        photoEditCtx = photoEditCanvas.getContext('2d');
    }
    
    return true;
}

// 초기화
document.addEventListener('DOMContentLoaded', () => {
    console.log('인생네컷 앱 초기화 시작...');
    
    if (!initDOMElements()) {
        return;
    }
    
    setupEventListeners();
    loadFrames();
    
    // IndexedDB 초기화 후 사진 로드
    initDB().then(() => {
        loadSavedPhotos();
    }).catch((error) => {
        console.error('IndexedDB 초기화 실패, localStorage 사용:', error);
        loadSavedPhotos(); // localStorage로 폴백
    });
    
});

// 프레임 로드
function loadFrames() {
    console.log('loadFrames 호출됨');
    console.log('frameList:', frameList);
    console.log('frames:', frames);
    
    if (!frameList) {
        console.error('frameList가 초기화되지 않았습니다.');
        // 다시 찾아보기
        frameList = document.getElementById('frameList');
        if (!frameList) {
            console.error('frameList 요소를 찾을 수 없습니다.');
            return;
        }
        console.log('frameList를 다시 찾았습니다:', frameList);
    }
    
    frameList.innerHTML = '';
    
    if (!frames || frames.length === 0) {
        console.error('프레임 데이터가 없습니다.');
        frameList.innerHTML = '<p style="text-align: center; color: white; padding: 20px;">프레임을 불러올 수 없습니다.</p>';
        return;
    }
    
    console.log(`${frames.length}개의 프레임을 로드합니다.`);
    
    frames.forEach((frame, index) => {
        try {
            console.log(`프레임 ${index + 1} 처리: ${frame.name}`);
            const frameItem = document.createElement('div');
            frameItem.className = 'frame-item';
            
            // 프레임 미리보기 생성
            createFramePreview(frame, frameItem);
            
            // 프레임 아이템이 비어있는지 확인
            if (frameItem.children.length === 0) {
                console.error(`프레임 ${index + 1} 미리보기 생성 실패 - 자식 요소 없음`);
                frameItem.innerHTML = `<div class="frame-preview"><div class="frame-preview-image" style="background: ${frame.layout?.frameColor || '#808080'}; padding: 20px; border-radius: 12px;"><div style="color: white; font-size: 18px;">${frame.name}</div></div><p class="frame-name">${frame.name}</p></div>`;
            }
            
            frameItem.addEventListener('click', () => selectFrame(frame));
            frameList.appendChild(frameItem);
            console.log(`프레임 ${index + 1} 추가 완료, frameList 자식 수: ${frameList.children.length}`);
        } catch (error) {
            console.error(`프레임 ${index + 1} 로드 실패:`, error, error.stack);
        }
    });
    
    console.log(`프레임 로드 완료: ${frameList.children.length}개 표시됨`);
}

// 프레임 미리보기 생성
function createFramePreview(frame, container) {
    try {
        console.log(`createFramePreview 시작: ${frame.name}`);
        if (!frame || !frame.layout) {
            console.error('유효하지 않은 프레임 데이터:', frame);
            container.innerHTML = '<div class="frame-preview"><p>프레임 오류</p></div>';
            return;
        }
        
        // 프레임 미리보기 컨테이너 생성
        const previewDiv = document.createElement('div');
        previewDiv.className = 'frame-preview';
        
        const previewImageDiv = document.createElement('div');
        previewImageDiv.className = 'frame-preview-image';
        
        const canvas = document.createElement('canvas');
        // 인생네컷 비율 3:4 (한눈에 보이도록 작은 크기)
        canvas.width = 180;
        canvas.height = 240;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
            console.error('Canvas context를 가져올 수 없습니다.');
            container.innerHTML = '<div class="frame-preview"><p>Canvas 오류</p></div>';
            return;
        }
        
        // 배경
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 프레임 배경색 (연하게) - rgba로 변환
        const frameColor = frame.layout.frameColor || '#808080';
        // hex를 rgba로 변환 (투명도 8%)
        let r, g, b;
        if (frameColor.startsWith('#')) {
            const hex = frameColor.slice(1);
            r = parseInt(hex.substr(0, 2), 16);
            g = parseInt(hex.substr(2, 2), 16);
            b = parseInt(hex.substr(4, 2), 16);
        } else {
            r = g = b = 128; // 기본값
        }
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.08)`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 프레임 테두리
        const frameWidth = frame.layout.frameWidth || 15;
        ctx.strokeStyle = frameColor;
        ctx.lineWidth = frameWidth * 0.15;
        ctx.strokeRect(
            frameWidth * 0.15,
            frameWidth * 0.15,
            canvas.width - frameWidth * 0.3,
            canvas.height - frameWidth * 0.3
        );
        
        // 프레임 내부 영역 계산 (테두리와 하단 텍스트 제외)
        const frameBorderWidth = frameWidth * 0.15;
        const bottomHeight = canvas.height * 0.08;
        const frameInnerX = frameBorderWidth;
        const frameInnerY = frameBorderWidth;
        const frameInnerWidth = canvas.width - (frameBorderWidth * 2);
        const frameInnerHeight = canvas.height - frameBorderWidth - bottomHeight;
        
        // 슬롯 영역 표시 (프레임 내부 영역 기준)
        if (frame.layout.slots && Array.isArray(frame.layout.slots)) {
            frame.layout.slots.forEach((slot, index) => {
                // 프레임 내부 영역 기준으로 슬롯 위치 계산
                const x = frameInnerX + (slot.x * frameInnerWidth);
                const y = frameInnerY + (slot.y * frameInnerHeight);
                const width = slot.width * frameInnerWidth;
                const height = slot.height * frameInnerHeight;
                
                // 슬롯 배경
                ctx.fillStyle = frame.layout.slotColor || '#f5f5f5';
                ctx.fillRect(x, y, width, height);
                
                // 슬롯 테두리
                ctx.strokeStyle = frameColor;
                ctx.lineWidth = 2;
                ctx.strokeRect(x, y, width, height);
                
                // 슬롯 번호 표시 (크리스마스 프레임은 번호 숨김)
                if (frame.id !== 2) {
                    ctx.fillStyle = frameColor;
                    ctx.font = 'bold 16px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText((index + 1).toString(), x + width / 2, y + height / 2);
                }
            });
        }
        
        // 하단 텍스트 영역
        const bottomY = canvas.height - bottomHeight;
        ctx.fillStyle = frameColor;
        ctx.fillRect(0, bottomY, canvas.width, bottomHeight);
        
        // 하단 텍스트
        if (frame.layout.bottomText) {
            ctx.fillStyle = '#ffffff';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(frame.layout.bottomText, canvas.width / 2, bottomY + bottomHeight / 2);
        }
        
        // 제목 (있는 경우)
        if (frame.layout.title) {
            ctx.fillStyle = frameColor;
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(frame.layout.title, canvas.width / 2, 35);
        }
        
        // DOM에 추가
        previewImageDiv.appendChild(canvas);
        previewDiv.appendChild(previewImageDiv);
        
        const nameP = document.createElement('p');
        nameP.className = 'frame-name';
        nameP.textContent = frame.name || '프레임';
        previewDiv.appendChild(nameP);
        
        // container에 추가하기 전에 확인
        if (container && container.appendChild) {
            container.appendChild(previewDiv);
            console.log(`createFramePreview 완료: ${frame.name}, 자식 요소: ${container.children.length}개`);
        } else {
            console.error('container가 유효하지 않습니다:', container);
            throw new Error('container가 유효하지 않습니다');
        }
    } catch (error) {
        console.error(`프레임 미리보기 생성 오류 (${frame?.name || '알 수 없음'}):`, error);
        // 간단한 폴백 표시
        try {
            const frameColor = frame?.layout?.frameColor || '#808080';
            const frameName = frame?.name || '프레임';
            container.innerHTML = `
                <div class="frame-preview">
                    <div class="frame-preview-image" style="background: ${frameColor}; padding: 20px; border-radius: 12px; min-height: 200px; display: flex; align-items: center; justify-content: center;">
                        <div style="color: white; font-size: 18px; font-weight: bold;">${frameName}</div>
                    </div>
                    <p class="frame-name">${frameName}</p>
                </div>
            `;
        } catch (fallbackError) {
            console.error('폴백 표시도 실패:', fallbackError);
            container.innerHTML = `<div class="frame-preview"><p>프레임 오류</p></div>`;
        }
    }
}

// 프레임 선택
function selectFrame(frame) {
    selectedFrame = frame;
    showScreen('photoSelectScreen');
    resetPhotoSelection();
    drawFrameBackground();
}

// 화면 전환
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
    
}

// 사진 선택 초기화
function resetPhotoSelection() {
    selectedPhotos = [null, null, null, null];
    photoTransforms = [
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 0, y: 0 }
    ];
    document.querySelectorAll('.photo-slot').forEach((slot, index) => {
        const input = document.getElementById(`photoInput${index}`);
        const canvas = slot.querySelector('.slot-canvas');
        const placeholder = slot.querySelector('.slot-placeholder');
        const removeBtn = slot.querySelector('.slot-remove');
        // 슬롯 배경을 원래대로
        slot.style.background = 'rgba(255, 255, 255, 0.95)';
        input.value = '';
        if (canvas) canvas.style.display = 'none';
        placeholder.style.display = 'flex';
        removeBtn.style.display = 'none';
    });
    // 슬롯 위치 업데이트
    setTimeout(() => {
        updatePhotoSlotPositions();
    }, 100);
    updateComposeButton();
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 파일 입력 변경
    for (let i = 0; i < 4; i++) {
        const input = document.getElementById(`photoInput${i}`);
        input.addEventListener('change', (e) => handlePhotoSelect(e, i));
    }
    
    // 슬롯 제거 버튼
    document.querySelectorAll('.slot-remove').forEach((btn, index) => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            removePhoto(index);
        });
    });
    
    // 저장
    saveBtn.addEventListener('click', savePhoto);
    
    // 다운로드
    downloadBtn.addEventListener('click', downloadPhoto);
    
    // 새로 만들기
    newPhotoBtn.addEventListener('click', () => {
        showScreen('frameSelectScreen');
        selectedFrame = null;
        resetPhotoSelection();
    });
    
    // 인생네컷 만들기
    composeBtn.addEventListener('click', composeLifecut);
    
    // 프레임 다시 선택
    backToFrameBtn.addEventListener('click', () => {
        showScreen('frameSelectScreen');
    });
    
    // 메뉴
    menuBtn.addEventListener('click', () => {
        sideMenu.classList.add('active');
    });
    
    closeMenuBtn.addEventListener('click', () => {
        sideMenu.classList.remove('active');
    });
    
    closePopupBtn.addEventListener('click', () => {
        savePopup.style.display = 'none';
        sideMenu.classList.remove('active');
    });
    
    // 이미지 보기 팝업
    closeImageViewBtn.addEventListener('click', () => {
        imageViewPopup.style.display = 'none';
        currentViewingPhoto = null;
    });
    
    downloadImageViewBtn.addEventListener('click', () => {
        if (currentViewingPhoto) {
            downloadSavedPhoto(currentViewingPhoto);
        }
    });
    
    // 팝업 외부 클릭 시 닫기
    imageViewPopup.addEventListener('click', (e) => {
        if (e.target === imageViewPopup) {
            imageViewPopup.style.display = 'none';
            currentViewingPhoto = null;
        }
    });
    
    // 사진 편집 팝업
    document.getElementById('closePhotoEditBtn').addEventListener('click', closePhotoEdit);
    document.getElementById('savePhotoEditBtn').addEventListener('click', savePhotoEdit);
    document.getElementById('resetPhotoEditBtn').addEventListener('click', resetPhotoEdit);
    document.getElementById('scaleSlider').addEventListener('input', updatePhotoEditScale);
    
    // 캔버스 드래그 이벤트
    photoEditCanvas.addEventListener('mousedown', startDrag);
    photoEditCanvas.addEventListener('mousemove', drag);
    photoEditCanvas.addEventListener('mouseup', endDrag);
    photoEditCanvas.addEventListener('mouseleave', endDrag);
    
    // 터치 이벤트 (모바일)
    photoEditCanvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            startDrag({
                clientX: touch.clientX,
                clientY: touch.clientY
            });
        }
    });
    photoEditCanvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            drag({
                clientX: touch.clientX,
                clientY: touch.clientY
            });
        }
    });
    photoEditCanvas.addEventListener('touchend', endDrag);
}

// 사진 선택 처리
function handlePhotoSelect(event, index) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        selectedPhotos[index] = e.target.result;
        // 사진 선택 시 변환 정보 초기화 (이동만)
        photoTransforms[index] = { x: 0, y: 0 };
        updatePhotoSlot(index, e.target.result);
        // 슬롯 위치 업데이트
        setTimeout(() => {
            updatePhotoSlotPositions();
        }, 50);
        updateComposeButton();
    };
    reader.readAsDataURL(file);
}

// 사진 슬롯 업데이트
function updatePhotoSlot(index, imageSrc) {
    const slot = document.querySelector(`.photo-slot[data-index="${index}"]`);
    const canvas = slot.querySelector('.slot-canvas');
    const placeholder = slot.querySelector('.slot-placeholder');
    const removeBtn = slot.querySelector('.slot-remove');
    
    // 사진이 추가되면 슬롯 배경을 투명하게
    if (imageSrc) {
        slot.style.background = 'transparent';
    } else {
        slot.style.background = 'rgba(255, 255, 255, 0.95)';
    }
    
    // 캔버스 설정 (고해상도)
    const slotRect = slot.getBoundingClientRect();
    const devicePixelRatio = window.devicePixelRatio || 2;
    
    canvas.width = slotRect.width * devicePixelRatio;
    canvas.height = slotRect.height * devicePixelRatio;
    canvas.style.width = slotRect.width + 'px';
    canvas.style.height = slotRect.height + 'px';
    
    const ctx = canvas.getContext('2d');
    ctx.scale(devicePixelRatio, devicePixelRatio);
    
    // 이미지 로드 및 그리기
    const img = new Image();
    img.onload = () => {
        // 실제 표시 크기 사용 (devicePixelRatio 제외)
        const displayWidth = canvas.width / devicePixelRatio;
        const displayHeight = canvas.height / devicePixelRatio;
        drawSlotImage(index, img, ctx, displayWidth, displayHeight);
    };
    img.src = imageSrc;
    
    canvas.style.display = 'block';
    placeholder.style.display = 'none';
    removeBtn.style.display = 'block';
    
    // 슬롯에 드래그 이벤트 추가 (이동만)
    setupSlotInteraction(slot, index, canvas, ctx);
}

// 사진 제거
function removePhoto(index) {
    selectedPhotos[index] = null;
    photoTransforms[index] = { x: 0, y: 0 };
    const slot = document.querySelector(`.photo-slot[data-index="${index}"]`);
    const input = document.getElementById(`photoInput${index}`);
    const canvas = slot.querySelector('.slot-canvas');
    const placeholder = slot.querySelector('.slot-placeholder');
    const removeBtn = slot.querySelector('.slot-remove');
    const controls = slot.querySelector('.slot-controls');
    
    // 슬롯 배경을 원래대로
    slot.style.background = 'rgba(255, 255, 255, 0.95)';
    
    input.value = '';
    if (canvas) canvas.style.display = 'none';
    placeholder.style.display = 'flex';
    removeBtn.style.display = 'none';
    if (controls) controls.style.display = 'none';
    
    updateComposeButton();
}

// 인생네컷 만들기 버튼 활성화 확인
function updateComposeButton() {
    const allPhotosSelected = selectedPhotos.every(photo => photo !== null);
    composeBtn.disabled = !allPhotosSelected;
}

// 인생네컷 합성
function composeLifecut() {
    if (!selectedFrame || selectedPhotos.some(photo => !photo)) {
        alert('모든 사진을 선택해주세요.');
        return;
    }
    
    // 캔버스 크기 설정 (인생네컷 비율: 3:4, 고해상도)
    const devicePixelRatio = window.devicePixelRatio || 2;
    const displayWidth = 400; // 화면 표시 크기 (작게)
    const displayHeight = 533; // 3:4 비율
    const renderWidth = 1200; // 실제 렌더링 크기 (고해상도)
    const renderHeight = 1600;
    
    resultCanvas.width = renderWidth * devicePixelRatio;
    resultCanvas.height = renderHeight * devicePixelRatio;
    resultCanvas.style.width = displayWidth + 'px';
    resultCanvas.style.height = displayHeight + 'px';
    
    // 고해상도 스케일링
    resultCtx.scale(devicePixelRatio, devicePixelRatio);
    
    const canvasWidth = renderWidth;
    const canvasHeight = renderHeight;
    
    // 배경
    resultCtx.fillStyle = '#ffffff';
    resultCtx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // 슬롯 배경색 그리기 (프레임에 슬롯 배경색이 있는 경우)
    if (selectedFrame.layout.slotColor && selectedFrame.layout.slots) {
        selectedFrame.layout.slots.forEach((slot, index) => {
            const x = Math.floor(slot.x * canvasWidth);
            const y = Math.floor(slot.y * canvasHeight);
            const width = Math.floor(slot.width * canvasWidth);
            const height = Math.floor(slot.height * canvasHeight);
            
            resultCtx.fillStyle = selectedFrame.layout.slotColor;
            resultCtx.fillRect(x, y, width, height);
        });
    }
    
    // 사진 배치 (비동기 처리)
    let loadedCount = 0;
    const totalPhotos = selectedPhotos.filter(p => p).length;
    
    selectedPhotos.forEach((photoSrc, index) => {
        if (!photoSrc) {
            loadedCount++;
            if (loadedCount === totalPhotos) {
                drawFrameBorder();
                showScreen('resultScreen');
            }
            return;
        }
        
        const slot = selectedFrame.layout.slots[index];
        const img = new Image();
        
        img.onload = () => {
            // 프레임 내부 영역 기준으로 슬롯 영역 계산
            const frameBorderWidth = selectedFrame.layout.frameWidth || 15;
            const bottomHeight = canvasHeight * 0.08;
            const frameInnerX = frameBorderWidth;
            const frameInnerY = frameBorderWidth;
            const frameInnerWidth = canvasWidth - (frameBorderWidth * 2);
            const frameInnerHeight = canvasHeight - frameBorderWidth - bottomHeight;
            
            // 슬롯 영역 계산 (정확한 픽셀 좌표)
            const x = Math.floor(frameInnerX + (slot.x * frameInnerWidth));
            const y = Math.floor(frameInnerY + (slot.y * frameInnerHeight));
            const width = Math.floor(slot.width * frameInnerWidth);
            const height = Math.floor(slot.height * frameInnerHeight);
            
            // 클리핑 영역 설정 (프레임 슬롯 영역만 그리기 - 정확한 경계)
            resultCtx.save();
            resultCtx.beginPath();
            resultCtx.rect(x, y, width, height);
            resultCtx.clip();
            
            // 사진을 슬롯에 맞게 그리기 (비율 유지하면서 채우기)
            const imgAspect = img.width / img.height;
            const slotAspect = width / height;
            
            let drawWidth, drawHeight, drawX, drawY;
            
            // 변환 정보 가져오기 (이동만)
            const transform = photoTransforms[index] || { x: 0, y: 0 };
            
            // 이동 범위 계산
            const limits = getMoveLimits(img, width, height);
            
            // 이동 값 제한
            const offsetX = clampMove(transform.x || 0, limits.minMoveX, limits.maxMoveX);
            const offsetY = clampMove(transform.y || 0, limits.minMoveY, limits.maxMoveY);
            
            // 이미지 소스 영역 계산 (크롭)
            let sourceX = 0, sourceY = 0, sourceWidth = img.width, sourceHeight = img.height;
            
            if (imgAspect > slotAspect) {
                // 이미지가 더 넓음 - 중앙에서 크롭
                const cropWidth = img.height * slotAspect;
                sourceX = (img.width - cropWidth) / 2;
                sourceWidth = cropWidth;
            } else {
                // 이미지가 더 좁음 - 중앙에서 크롭
                const cropHeight = img.width / slotAspect;
                sourceY = (img.height - cropHeight) / 2;
                sourceHeight = cropHeight;
            }
            
            // 이동에 따른 소스 영역 조정
            if (limits.maxMoveX > 0) {
                const moveRatio = offsetX / limits.maxMoveX; // -1 ~ 1
                const maxCropX = (img.width - sourceWidth) / 2;
                sourceX = (img.width - sourceWidth) / 2 - moveRatio * maxCropX;
                sourceX = Math.max(0, Math.min(img.width - sourceWidth, sourceX));
            }
            
            if (limits.maxMoveY > 0) {
                const moveRatio = offsetY / limits.maxMoveY; // -1 ~ 1
                const maxCropY = (img.height - sourceHeight) / 2;
                sourceY = (img.height - sourceHeight) / 2 - moveRatio * maxCropY;
                sourceY = Math.max(0, Math.min(img.height - sourceHeight, sourceY));
            }
            
            // 사진 그리기 (크롭된 영역을 슬롯에 맞게)
            resultCtx.drawImage(
                img,
                sourceX, sourceY, sourceWidth, sourceHeight, // 소스 영역
                x, y, width, height // 대상 영역 (슬롯 전체)
            );
            
            // 클리핑 해제
            resultCtx.restore();
            
            // 사진 테두리 (슬롯 경계선) - 클리핑 후에 그리기
            resultCtx.strokeStyle = selectedFrame.layout.frameColor || '#808080';
            resultCtx.lineWidth = 2;
            resultCtx.strokeRect(x, y, width, height);
            
            loadedCount++;
            
            // 모든 사진이 로드되면 프레임 테두리 그리고 결과 화면 표시
            if (loadedCount === totalPhotos) {
                drawFrameBorder();
                showScreen('resultScreen');
            }
        };
        
        img.onerror = () => {
            console.error(`사진 ${index + 1} 로드 실패`);
            loadedCount++;
            if (loadedCount === totalPhotos) {
                drawFrameBorder();
                showScreen('resultScreen');
            }
        };
        
        img.src = photoSrc;
    });
    
    // 프레임 테두리 그리기 함수
    function drawFrameBorder() {
        // 외곽 프레임 테두리 (회색)
        resultCtx.strokeStyle = selectedFrame.layout.frameColor || '#808080';
        resultCtx.lineWidth = selectedFrame.layout.frameWidth || 15;
        resultCtx.strokeRect(
            selectedFrame.layout.frameWidth / 2,
            selectedFrame.layout.frameWidth / 2,
            canvasWidth - selectedFrame.layout.frameWidth,
            canvasHeight - selectedFrame.layout.frameWidth
        );
        
        // 하단 텍스트 영역
        const bottomHeight = canvasHeight * 0.08;
        const bottomY = canvasHeight - bottomHeight;
        resultCtx.fillStyle = selectedFrame.layout.frameColor || '#808080';
        resultCtx.fillRect(0, bottomY, canvasWidth, bottomHeight);
        
        // 하단 텍스트
        if (selectedFrame.layout.bottomText) {
            resultCtx.fillStyle = '#ffffff';
            resultCtx.font = '24px Arial';
            resultCtx.textAlign = 'center';
            resultCtx.textBaseline = 'middle';
            resultCtx.fillText(selectedFrame.layout.bottomText, canvasWidth / 2, bottomY + bottomHeight / 2);
        }
    }
}

// IndexedDB 초기화
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => {
            console.error('IndexedDB 오픈 실패:', request.error);
            reject(request.error);
        };
        
        request.onsuccess = () => {
            db = request.result;
            console.log('IndexedDB 초기화 완료');
            resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            if (!database.objectStoreNames.contains(STORE_NAME)) {
                const objectStore = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
                objectStore.createIndex('timestamp', 'timestamp', { unique: false });
            }
        };
    });
}

// IndexedDB에 사진 저장
function savePhotoToDB(photoData) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('IndexedDB가 초기화되지 않았습니다.'));
            return;
        }
        
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.add(photoData);
        
        request.onsuccess = () => {
            console.log('IndexedDB 저장 완료:', photoData.id);
            resolve();
        };
        
        request.onerror = () => {
            console.error('IndexedDB 저장 실패:', request.error);
            reject(request.error);
        };
    });
}

// 사진 저장 (압축 없이 원본 품질)
async function savePhoto() {
    try {
        // 원본 PNG 품질로 저장 (압축 없음)
        const imageData = resultCanvas.toDataURL('image/png');
        
        const photoData = {
            id: Date.now(),
            data: imageData,
            timestamp: new Date().toISOString()
        };
        
        // IndexedDB에 저장
        await savePhotoToDB(photoData);
        
        // 메모리 배열에도 추가 (갤러리 표시용)
        savedPhotos.push(photoData);
        
        updateGallery();
        savePopup.style.display = 'flex';
    } catch (error) {
        console.error('저장 실패:', error);
        alert('저장 중 오류가 발생했습니다: ' + error.message);
    }
}

// 사진 다운로드
function downloadPhoto() {
    const imageData = resultCanvas.toDataURL('image/png');
    
    // 모바일 기기 감지
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile && navigator.share) {
        // 모바일에서 Web Share API 사용
        resultCanvas.toBlob((blob) => {
            if (blob) {
                const file = new File([blob], `인생네컷_${Date.now()}.png`, { type: 'image/png' });
                navigator.share({
                    title: '인생네컷',
                    text: '인생네컷을 공유합니다',
                    files: [file]
                }).then(() => {
                    // 공유 성공 시 피드백
                    showDownloadFeedback('공유되었습니다!');
                }).catch((error) => {
                    // 공유 실패 시 일반 다운로드로 폴백
                    console.log('공유 실패, 일반 다운로드로 전환:', error);
                    downloadImageDirectly(imageData);
                });
            } else {
                downloadImageDirectly(imageData);
            }
        }, 'image/png');
    } else {
        // 데스크톱 또는 Web Share API 미지원 기기
        downloadImageDirectly(imageData);
    }
}

// 직접 다운로드 함수
function downloadImageDirectly(imageData, filename = null) {
    const downloadFilename = filename || `인생네컷_${Date.now()}.png`;
    
    // Blob URL 사용 (더 나은 모바일 지원)
    fetch(imageData)
        .then(res => res.blob())
        .then(blob => {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = downloadFilename;
            link.href = url;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // 메모리 정리
            setTimeout(() => URL.revokeObjectURL(url), 100);
            
            // 다운로드 피드백
            showDownloadFeedback('다운로드가 시작되었습니다!');
        })
        .catch((error) => {
            console.error('다운로드 실패:', error);
            // 폴백: 기본 방법
            const link = document.createElement('a');
            link.download = downloadFilename;
            link.href = imageData;
            link.click();
            showDownloadFeedback('다운로드가 시작되었습니다!');
        });
}

// 다운로드 피드백 표시
function showDownloadFeedback(message) {
    // 기존 피드백 제거
    const existingFeedback = document.getElementById('downloadFeedback');
    if (existingFeedback) {
        existingFeedback.remove();
    }
    
    // 피드백 요소 생성
    const feedback = document.createElement('div');
    feedback.id = 'downloadFeedback';
    feedback.textContent = message;
    feedback.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 20px 30px;
        border-radius: 10px;
        font-size: 16px;
        z-index: 10000;
        pointer-events: none;
        animation: fadeInOut 2s ease-in-out;
    `;
    
    // 애니메이션 추가
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeInOut {
            0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
            20% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(feedback);
    
    // 2초 후 제거
    setTimeout(() => {
        if (feedback.parentNode) {
            feedback.remove();
        }
    }, 2000);
}

// IndexedDB에서 사진 로드
function loadPhotosFromDB() {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('IndexedDB가 초기화되지 않았습니다.'));
            return;
        }
        
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('timestamp');
        const request = index.openCursor(null, 'prev'); // 최신순
        
        const photos = [];
        
        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                photos.push(cursor.value);
                cursor.continue();
            } else {
                resolve(photos);
            }
        };
        
        request.onerror = () => {
            console.error('IndexedDB 로드 실패:', request.error);
            reject(request.error);
        };
    });
}

// 저장된 사진 로드
async function loadSavedPhotos() {
    try {
        if (db) {
            savedPhotos = await loadPhotosFromDB();
            updateGallery();
        } else {
            // IndexedDB 초기화 실패 시 localStorage에서 로드 (기존 데이터 호환)
            try {
                const saved = localStorage.getItem('savedPhotos');
                if (saved) {
                    savedPhotos = JSON.parse(saved);
                    if (!Array.isArray(savedPhotos)) {
                        savedPhotos = [];
                    } else {
                        updateGallery();
                    }
                }
            } catch (error) {
                console.error('localStorage 로드 실패:', error);
                savedPhotos = [];
            }
        }
    } catch (error) {
        console.error('저장된 사진 로드 실패:', error);
        savedPhotos = [];
    }
}

// 갤러리 업데이트
function updateGallery() {
    gallery.innerHTML = '';
    
    if (!savedPhotos || savedPhotos.length === 0) {
        gallery.innerHTML = '<p class="empty-message">저장된 사진이 없습니다.</p>';
        return;
    }
    
    savedPhotos.slice().reverse().forEach((photo, index) => {
        if (!photo || !photo.data) return;
        
        const galleryItem = document.createElement('div');
        galleryItem.className = 'gallery-item';
        
        const img = document.createElement('img');
        img.src = photo.data;
        img.alt = '저장된 인생네컷';
        img.loading = 'lazy';
        
        img.onerror = () => {
            galleryItem.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">이미지 로드 실패</div>';
        };
        
        galleryItem.appendChild(img);
        galleryItem.addEventListener('click', () => {
            showImageView(photo);
        });
        
        gallery.appendChild(galleryItem);
    });
}

// 이미지 보기 팝업 표시
function showImageView(photo) {
    if (!photo || !photo.data) return;
    
    currentViewingPhoto = photo;
    viewImage.src = photo.data;
    imageViewPopup.style.display = 'flex';
}

// 저장된 사진 다운로드
function downloadSavedPhoto(photo) {
    if (!photo || !photo.data) return;
    
    const imageData = photo.data;
    
    // 모바일 기기 감지
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile && navigator.share) {
        // 모바일에서 Web Share API 사용
        fetch(imageData)
            .then(res => res.blob())
            .then(blob => {
                const file = new File([blob], `인생네컷_${photo.id}.png`, { type: 'image/png' });
                navigator.share({
                    title: '인생네컷',
                    text: '인생네컷을 공유합니다',
                    files: [file]
                }).then(() => {
                    showDownloadFeedback('공유되었습니다!');
                }).catch((error) => {
                    console.log('공유 실패, 일반 다운로드로 전환:', error);
                    downloadImageDirectly(imageData, `인생네컷_${photo.id}.png`);
                });
            })
            .catch((error) => {
                console.error('Blob 변환 실패:', error);
                downloadImageDirectly(imageData, `인생네컷_${photo.id}.png`);
            });
    } else {
        // 데스크톱 또는 Web Share API 미지원 기기
        downloadImageDirectly(imageData, `인생네컷_${photo.id}.png`);
    }
}

// 사진 편집 팝업 열기
function openPhotoEdit(index) {
    if (!selectedPhotos[index]) return;
    
    currentEditIndex = index;
    const transform = photoTransforms[index];
    photoEditScale = transform.scale || 1;
    photoEditX = transform.x || 0;
    photoEditY = transform.y || 0;
    
    // 슬라이더 값 설정
    document.getElementById('scaleSlider').value = photoEditScale;
    document.getElementById('scaleValue').textContent = Math.round(photoEditScale * 100) + '%';
    
    // 캔버스 크기 설정
    photoEditCanvas.width = 400;
    photoEditCanvas.height = 400;
    
    // 사진 그리기
    drawPhotoEdit();
    
    photoEditPopup.style.display = 'flex';
}

// 사진 편집 화면 그리기
function drawPhotoEdit() {
    if (currentEditIndex < 0 || !selectedPhotos[currentEditIndex]) return;
    
    const img = new Image();
    img.onload = () => {
        const canvasWidth = photoEditCanvas.width;
        const canvasHeight = photoEditCanvas.height;
        
        // 배경
        photoEditCtx.fillStyle = '#f5f5f5';
        photoEditCtx.fillRect(0, 0, canvasWidth, canvasHeight);
        
        // 프레임 영역 표시 (인생네컷 비율)
        const frameWidth = canvasWidth * 0.9;
        const frameHeight = frameWidth * (4/3); // 3:4 비율
        const frameX = (canvasWidth - frameWidth) / 2;
        const frameY = (canvasHeight - frameHeight) / 2;
        
        photoEditCtx.strokeStyle = '#667eea';
        photoEditCtx.lineWidth = 3;
        photoEditCtx.strokeRect(frameX, frameY, frameWidth, frameHeight);
        
        // 사진 그리기 (변환 적용)
        const imgAspect = img.width / img.height;
        const frameAspect = frameWidth / frameHeight;
        
        let baseWidth, baseHeight;
        if (imgAspect > frameAspect) {
            baseWidth = frameWidth;
            baseHeight = img.height * (frameWidth / img.width);
        } else {
            baseHeight = frameHeight;
            baseWidth = img.width * (frameHeight / img.height);
        }
        
        const scaledWidth = baseWidth * photoEditScale;
        const scaledHeight = baseHeight * photoEditScale;
        
        const drawX = frameX + (frameWidth - baseWidth) / 2 + photoEditX;
        const drawY = frameY + (frameHeight - baseHeight) / 2 + photoEditY;
        
        // 클리핑
        photoEditCtx.save();
        photoEditCtx.beginPath();
        photoEditCtx.rect(frameX, frameY, frameWidth, frameHeight);
        photoEditCtx.clip();
        
        photoEditCtx.drawImage(img, drawX, drawY, scaledWidth, scaledHeight);
        photoEditCtx.restore();
    };
    img.src = selectedPhotos[currentEditIndex];
}

// 드래그 시작
function startDrag(e) {
    isDragging = true;
    dragStartX = e.clientX - photoEditX;
    dragStartY = e.clientY - photoEditY;
}

// 드래그 중
function drag(e) {
    if (!isDragging) return;
    photoEditX = e.clientX - dragStartX;
    photoEditY = e.clientY - dragStartY;
    drawPhotoEdit();
}

// 드래그 종료
function endDrag() {
    isDragging = false;
}

// 스케일 업데이트
function updatePhotoEditScale(e) {
    photoEditScale = parseFloat(e.target.value);
    document.getElementById('scaleValue').textContent = Math.round(photoEditScale * 100) + '%';
    drawPhotoEdit();
}

// 사진 편집 초기화
function resetPhotoEdit() {
    photoEditScale = 1;
    photoEditX = 0;
    photoEditY = 0;
    document.getElementById('scaleSlider').value = 1;
    document.getElementById('scaleValue').textContent = '100%';
    drawPhotoEdit();
}

// 사진 편집 저장
function savePhotoEdit() {
    if (currentEditIndex < 0) return;
    
    photoTransforms[currentEditIndex] = {
        scale: photoEditScale,
        x: photoEditX,
        y: photoEditY
    };
    
    closePhotoEdit();
}

// 사진 편집 팝업 닫기
function closePhotoEdit() {
    photoEditPopup.style.display = 'none';
    currentEditIndex = -1;
    isDragging = false;
}

// 이동 범위 제한 계산 (프레임 사이즈에 맞게 자동 조정)
function getMoveLimits(img, slotWidth, slotHeight) {
    const imgAspect = img.width / img.height;
    const slotAspect = slotWidth / slotHeight;
    
    let baseWidth, baseHeight;
    // 슬롯을 완전히 채우도록 크기 계산 (cover 모드)
    if (imgAspect > slotAspect) {
        // 이미지가 더 넓음 - 높이에 맞춰서 너비를 잘라냄
        baseHeight = slotHeight;
        baseWidth = img.width * (slotHeight / img.height);
    } else {
        // 이미지가 더 좁음 - 너비에 맞춰서 높이를 잘라냄
        baseWidth = slotWidth;
        baseHeight = img.height * (slotWidth / img.width);
    }
    
    // 이동 가능한 최대/최소 범위 계산
    // 사진이 슬롯보다 크면 이동 가능, 작으면 이동 불가
    const maxMoveX = baseWidth > slotWidth ? (baseWidth - slotWidth) / 2 : 0;
    const maxMoveY = baseHeight > slotHeight ? (baseHeight - slotHeight) / 2 : 0;
    const minMoveX = -maxMoveX;
    const minMoveY = -maxMoveY;
    
    return {
        baseWidth,
        baseHeight,
        maxMoveX,
        maxMoveY,
        minMoveX,
        minMoveY
    };
}

// 이동 값 제한
function clampMove(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

// 슬롯 이미지 그리기
function drawSlotImage(index, img, ctx, width, height) {
    const transform = photoTransforms[index] || { x: 0, y: 0 };
    
    // 클리핑
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    ctx.clip();
    
    // 배경
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, width, height);
    
    // 이동 범위 계산
    const limits = getMoveLimits(img, width, height);
    
    // 이동 값 제한
    const clampedX = clampMove(transform.x, limits.minMoveX, limits.maxMoveX);
    const clampedY = clampMove(transform.y, limits.minMoveY, limits.maxMoveY);
    
    // 제한된 이동 값 저장
    photoTransforms[index].x = clampedX;
    photoTransforms[index].y = clampedY;
    
    // 이미지 소스 영역 계산 (크롭)
    const imgAspect = img.width / img.height;
    const slotAspect = width / height;
    
    let sourceX = 0, sourceY = 0, sourceWidth = img.width, sourceHeight = img.height;
    
    if (imgAspect > slotAspect) {
        // 이미지가 더 넓음 - 중앙에서 크롭
        const cropWidth = img.height * slotAspect;
        sourceX = (img.width - cropWidth) / 2;
        sourceWidth = cropWidth;
    } else {
        // 이미지가 더 좁음 - 중앙에서 크롭
        const cropHeight = img.width / slotAspect;
        sourceY = (img.height - cropHeight) / 2;
        sourceHeight = cropHeight;
    }
    
    // 이동에 따른 소스 영역 조정
    if (limits.maxMoveX > 0) {
        const moveRatio = clampedX / limits.maxMoveX; // -1 ~ 1
        const maxCropX = (img.width - sourceWidth) / 2;
        sourceX = (img.width - sourceWidth) / 2 - moveRatio * maxCropX;
        sourceX = Math.max(0, Math.min(img.width - sourceWidth, sourceX));
    }
    
    if (limits.maxMoveY > 0) {
        const moveRatio = clampedY / limits.maxMoveY; // -1 ~ 1
        const maxCropY = (img.height - sourceHeight) / 2;
        sourceY = (img.height - sourceHeight) / 2 - moveRatio * maxCropY;
        sourceY = Math.max(0, Math.min(img.height - sourceHeight, sourceY));
    }
    
    // 이미지 그리기 (크롭된 영역을 슬롯에 맞게)
    ctx.drawImage(
        img,
        sourceX, sourceY, sourceWidth, sourceHeight, // 소스 영역
        0, 0, width, height // 대상 영역 (슬롯 전체)
    );
    
    ctx.restore();
}

// 슬롯 상호작용 설정 (이동만)
function setupSlotInteraction(slot, index, canvas, ctx) {
    let isDragging = false;
    let dragStartX = 0, dragStartY = 0;
    let initialX = 0, initialY = 0;
    
    // 드래그 시작
    const startDrag = (e) => {
        isDragging = true;
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        // 초기 위치 저장
        initialX = photoTransforms[index].x || 0;
        initialY = photoTransforms[index].y || 0;
        
        // 드래그 시작 지점 저장 (캔버스 좌표 기준)
        dragStartX = (clientX - rect.left) * (canvas.width / rect.width / (window.devicePixelRatio || 2));
        dragStartY = (clientY - rect.top) * (canvas.height / rect.height / (window.devicePixelRatio || 2));
    };
    
    // 드래그 중
    const drag = (e) => {
        if (!isDragging) return;
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        // 현재 마우스/터치 위치를 캔버스 좌표로 변환
        const currentX = (clientX - rect.left) * (canvas.width / rect.width / (window.devicePixelRatio || 2));
        const currentY = (clientY - rect.top) * (canvas.height / rect.height / (window.devicePixelRatio || 2));
        
        // 이동 거리 계산
        const deltaX = currentX - dragStartX;
        const deltaY = currentY - dragStartY;
        
        // 이미지 로드하여 이동 범위 계산
        const img = new Image();
        img.onload = () => {
            const slotWidth = canvas.width / (window.devicePixelRatio || 2);
            const slotHeight = canvas.height / (window.devicePixelRatio || 2);
            const limits = getMoveLimits(img, slotWidth, slotHeight);
            
            // 이동 범위 내로 제한
            const newX = initialX + deltaX;
            const newY = initialY + deltaY;
            
            photoTransforms[index].x = clampMove(newX, limits.minMoveX, limits.maxMoveX);
            photoTransforms[index].y = clampMove(newY, limits.minMoveY, limits.maxMoveY);
            
            // 이미지 다시 그리기
            drawSlotImage(index, img, ctx, slotWidth, slotHeight);
        };
        img.src = selectedPhotos[index];
    };
    
    // 드래그 종료
    const endDrag = () => {
        isDragging = false;
    };
    
    // 마우스 이벤트
    canvas.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        startDrag(e);
    });
    canvas.addEventListener('mousemove', drag);
    canvas.addEventListener('mouseup', endDrag);
    canvas.addEventListener('mouseleave', endDrag);
    
    // 터치 이벤트
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.touches.length === 1) {
            startDrag(e);
        }
    });
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.touches.length === 1) {
            drag(e);
        }
    });
    canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        endDrag();
    });
}

// 프레임 배경 그리기
function drawFrameBackground() {
    // 프레임이 선택되지 않았으면 그리지 않음
    if (!selectedFrame || !frameBackgroundCanvas || !frameBackgroundCtx) {
        return;
    }
    
    // 캔버스 크기 설정 (인생네컷 비율 3:4)
    const container = document.querySelector('.frame-preview-background');
    if (!container) return;
    
    const containerWidth = Math.min(container.offsetWidth || 600, 600);
    const containerHeight = containerWidth * (4/3); // 3:4 비율
    
    frameBackgroundCanvas.width = containerWidth;
    frameBackgroundCanvas.height = containerHeight;
    
    const ctx = frameBackgroundCtx;
    const width = frameBackgroundCanvas.width;
    const height = frameBackgroundCanvas.height;
    
    // 전체를 투명하게 시작 (사진이 보이도록)
    ctx.clearRect(0, 0, width, height);
    
    // 프레임 테두리
    const frameBorderWidth = selectedFrame.layout.frameWidth * (width / 800);
    ctx.strokeStyle = selectedFrame.layout.frameColor || '#808080';
    ctx.lineWidth = frameBorderWidth;
    ctx.strokeRect(
        frameBorderWidth / 2,
        frameBorderWidth / 2,
        width - frameBorderWidth,
        height - frameBorderWidth
    );
    
    // 프레임 내부 영역 계산
    const bottomHeight = height * 0.08;
    const frameInnerX = frameBorderWidth;
    const frameInnerY = frameBorderWidth;
    const frameInnerWidth = width - (frameBorderWidth * 2);
    const frameInnerHeight = height - frameBorderWidth - bottomHeight;
    
    // 슬롯 영역은 투명하게 유지 (사진이 보이도록)
    // 슬롯 테두리만 그리기
    if (selectedFrame.layout.slots && Array.isArray(selectedFrame.layout.slots)) {
        selectedFrame.layout.slots.forEach((slot, index) => {
            const x = frameInnerX + (slot.x * frameInnerWidth);
            const y = frameInnerY + (slot.y * frameInnerHeight);
            const slotWidth = slot.width * frameInnerWidth;
            const slotHeight = slot.height * frameInnerHeight;
            
            // 슬롯 테두리만 그리기 (내부는 투명)
            ctx.strokeStyle = selectedFrame.layout.frameColor || '#808080';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, slotWidth, slotHeight);
        });
    }
    
    // 하단 텍스트 영역 (bottomHeight는 이미 위에서 선언됨)
    const bottomY = height - bottomHeight;
    ctx.fillStyle = selectedFrame.layout.frameColor || '#808080';
    ctx.fillRect(0, bottomY, width, bottomHeight);
    
    // 하단 텍스트
    if (selectedFrame.layout.bottomText) {
        ctx.fillStyle = '#ffffff';
        ctx.font = `${Math.round(14 * (width / 800))}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(selectedFrame.layout.bottomText, width / 2, bottomY + bottomHeight / 2);
    }
    
    // 제목 (있는 경우)
    if (selectedFrame.layout.title) {
        ctx.fillStyle = selectedFrame.layout.frameColor || '#808080';
        ctx.font = `bold ${Math.round(48 * (width / 800))}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(selectedFrame.layout.title, width / 2, Math.round(80 * (height / 1067)));
    }
    
    // 사진 슬롯 위치 조정
    setTimeout(() => {
        updatePhotoSlotPositions();
    }, 100);
}

// 사진 슬롯 위치 업데이트 (프레임 내부에만 위치)
function updatePhotoSlotPositions() {
    if (!selectedFrame || !photoSlots) return;
    
    const container = document.querySelector('.frame-preview-background');
    if (!container) return;
    
    // 프레임 내부에 맞춰 배치
    const canvas = frameBackgroundCanvas;
    if (!canvas) return;
    
    // 컨테이너와 캔버스 크기
    const containerRect = container.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    
    // 사진 슬롯 컨테이너를 캔버스와 같은 위치에 배치
    photoSlots.style.position = 'absolute';
    photoSlots.style.left = (canvasRect.left - containerRect.left) + 'px';
    photoSlots.style.top = (canvasRect.top - containerRect.top) + 'px';
    photoSlots.style.width = canvasRect.width + 'px';
    photoSlots.style.height = canvasRect.height + 'px';
    
    // 캔버스 실제 표시 크기 (CSS 크기)
    const canvasDisplayWidth = canvasRect.width;
    const canvasDisplayHeight = canvasRect.height;
    
    // 프레임 테두리 두께 계산 (표시 크기 기준)
    const frameBorderWidth = selectedFrame.layout.frameWidth * (canvasDisplayWidth / 800);
    
    // 하단 텍스트 영역 높이
    const bottomHeight = canvasDisplayHeight * 0.08;
    
    // 실제 프레임 내부 영역 (테두리와 하단 텍스트 제외)
    const frameInnerX = frameBorderWidth;
    const frameInnerY = frameBorderWidth;
    const frameInnerWidth = canvasDisplayWidth - (frameBorderWidth * 2);
    const frameInnerHeight = canvasDisplayHeight - frameBorderWidth - bottomHeight;
    
    // 각 슬롯을 프레임 내부 영역에 맞춰 배치
    document.querySelectorAll('.photo-slot').forEach((slot, index) => {
        if (selectedFrame.layout.slots && selectedFrame.layout.slots[index]) {
            const frameSlot = selectedFrame.layout.slots[index];
            
            // 프레임 내부 영역 기준으로 위치 계산
            const slotX = frameInnerX + (frameSlot.x * frameInnerWidth);
            const slotY = frameInnerY + (frameSlot.y * frameInnerHeight);
            const slotWidth = frameSlot.width * frameInnerWidth;
            const slotHeight = frameSlot.height * frameInnerHeight;
            
            slot.style.position = 'absolute';
            slot.style.left = slotX + 'px';
            slot.style.top = slotY + 'px';
            slot.style.width = slotWidth + 'px';
            slot.style.height = slotHeight + 'px';
            slot.style.margin = '0';
        }
    });
}


// 윈도우 리사이즈 시 프레임 배경 다시 그리기
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        if (photoSelectScreen && photoSelectScreen.classList.contains('active')) {
            if (selectedFrame) {
                drawFrameBackground();
            }
            // 슬롯 위치도 다시 계산
            setTimeout(() => {
                updatePhotoSlotPositions();
            }, 50);
        }
    }, 200);
});
