/*

   Porting: Search for WIN32 to find windows-specific code
            snippets which need to be replaced or removed.

*/

#ifdef WIN32
#include "ddrawkit.h"
#else
#include "sdlkit.h"
#endif
#include <stdio.h>
#include <stdarg.h>
#include <stdlib.h>
#include <time.h>
#include <math.h>
#ifdef WIN32
#include "DPInput.h" // WIN32
#include "pa/portaudio.h"
#include "fileselector.h" // WIN32
#else
#include "SDL.h"
#endif

#define rnd(n) (rand()%(n+1))

#define PI 3.14159265f

float frnd(float range)
{
	return (float)rnd(10000)/10000*range;
}

struct Spriteset
{
	DWORD *data;
	int width;
	int height;
	int pitch;
};

Spriteset font;
Spriteset ld48;

struct Category
{
	char name[32];
};

Category categories[10];

int wave_type;

float p_base_freq;
float p_freq_limit;
float p_freq_ramp;
float p_freq_dramp;
float p_duty;
float p_duty_ramp;

float p_vib_strength;
float p_vib_speed;
float p_vib_delay;

float p_env_attack;
float p_env_sustain;
float p_env_decay;
float p_env_punch;

bool filter_on;
float p_lpf_resonance;
float p_lpf_freq;
float p_lpf_ramp;
float p_hpf_freq;
float p_hpf_ramp;

float p_pha_offset;
float p_pha_ramp;

float p_repeat_speed;

float p_arp_speed;
float p_arp_mod;

float master_vol=0.05f;

float sound_vol=0.5f;


bool playing_sample=false;
int phase;
double fperiod;
double fmaxperiod;
double fslide;
double fdslide;
int period;
float square_duty;
float square_slide;
int env_stage;
int env_time;
int env_length[3];
float env_vol;
float fphase;
float fdphase;
int iphase;
float phaser_buffer[1024];
int ipp;
float noise_buffer[32];
float fltp;
float fltdp;
float fltw;
float fltw_d;
float fltdmp;
float fltphp;
float flthp;
float flthp_d;
float vib_phase;
float vib_speed;
float vib_amp;
int rep_time;
int rep_limit;
int arp_time;
int arp_limit;
double arp_mod;

float* vselected=NULL;
int vcurbutton=-1;

int wav_bits=16;
int wav_freq=44100;

int file_sampleswritten;
float filesample=0.0f;
int fileacc=0;

void ResetParams()
{
	wave_type=0;

	p_base_freq=0.3f;
	p_freq_limit=0.0f;
	p_freq_ramp=0.0f;
	p_freq_dramp=0.0f;
	p_duty=0.0f;
	p_duty_ramp=0.0f;

	p_vib_strength=0.0f;
	p_vib_speed=0.0f;
	p_vib_delay=0.0f;

	p_env_attack=0.0f;
	p_env_sustain=0.3f;
	p_env_decay=0.4f;
	p_env_punch=0.0f;

	filter_on=false;
	p_lpf_resonance=0.0f;
	p_lpf_freq=1.0f;
	p_lpf_ramp=0.0f;
	p_hpf_freq=0.0f;
	p_hpf_ramp=0.0f;
	
	p_pha_offset=0.0f;
	p_pha_ramp=0.0f;

	p_repeat_speed=0.0f;

	p_arp_speed=0.0f;
	p_arp_mod=0.0f;
}

bool LoadSettings(char* filename)
{
	FILE* file=fopen(filename, "rb");
	if(!file)
		return false;

	int version=0;
	fread(&version, 1, sizeof(int), file);
	if(version!=100 && version!=101 && version!=102)
		return false;

	fread(&wave_type, 1, sizeof(int), file);

	sound_vol=0.5f;
	if(version==102)
		fread(&sound_vol, 1, sizeof(float), file);

	fread(&p_base_freq, 1, sizeof(float), file);
	fread(&p_freq_limit, 1, sizeof(float), file);
	fread(&p_freq_ramp, 1, sizeof(float), file);
	if(version>=101)
		fread(&p_freq_dramp, 1, sizeof(float), file);
	fread(&p_duty, 1, sizeof(float), file);
	fread(&p_duty_ramp, 1, sizeof(float), file);

	fread(&p_vib_strength, 1, sizeof(float), file);
	fread(&p_vib_speed, 1, sizeof(float), file);
	fread(&p_vib_delay, 1, sizeof(float), file);

	fread(&p_env_attack, 1, sizeof(float), file);
	fread(&p_env_sustain, 1, sizeof(float), file);
	fread(&p_env_decay, 1, sizeof(float), file);
	fread(&p_env_punch, 1, sizeof(float), file);

	fread(&filter_on, 1, sizeof(bool), file);
	fread(&p_lpf_resonance, 1, sizeof(float), file);
	fread(&p_lpf_freq, 1, sizeof(float), file);
	fread(&p_lpf_ramp, 1, sizeof(float), file);
	fread(&p_hpf_freq, 1, sizeof(float), file);
	fread(&p_hpf_ramp, 1, sizeof(float), file);
	
	fread(&p_pha_offset, 1, sizeof(float), file);
	fread(&p_pha_ramp, 1, sizeof(float), file);

	fread(&p_repeat_speed, 1, sizeof(float), file);

	if(version>=101)
	{
		fread(&p_arp_speed, 1, sizeof(float), file);
		fread(&p_arp_mod, 1, sizeof(float), file);
	}

	fclose(file);
	return true;
}

bool SaveSettings(char* filename)
{
	FILE* file=fopen(filename, "wb");
	if(!file)
		return false;

	int version=102;
	fwrite(&version, 1, sizeof(int), file);

	fwrite(&wave_type, 1, sizeof(int), file);

	fwrite(&sound_vol, 1, sizeof(float), file);

	fwrite(&p_base_freq, 1, sizeof(float), file);
	fwrite(&p_freq_limit, 1, sizeof(float), file);
	fwrite(&p_freq_ramp, 1, sizeof(float), file);
	fwrite(&p_freq_dramp, 1, sizeof(float), file);
	fwrite(&p_duty, 1, sizeof(float), file);
	fwrite(&p_duty_ramp, 1, sizeof(float), file);

	fwrite(&p_vib_strength, 1, sizeof(float), file);
	fwrite(&p_vib_speed, 1, sizeof(float), file);
	fwrite(&p_vib_delay, 1, sizeof(float), file);

	fwrite(&p_env_attack, 1, sizeof(float), file);
	fwrite(&p_env_sustain, 1, sizeof(float), file);
	fwrite(&p_env_decay, 1, sizeof(float), file);
	fwrite(&p_env_punch, 1, sizeof(float), file);

	fwrite(&filter_on, 1, sizeof(bool), file);
	fwrite(&p_lpf_resonance, 1, sizeof(float), file);
	fwrite(&p_lpf_freq, 1, sizeof(float), file);
	fwrite(&p_lpf_ramp, 1, sizeof(float), file);
	fwrite(&p_hpf_freq, 1, sizeof(float), file);
	fwrite(&p_hpf_ramp, 1, sizeof(float), file);
	
	fwrite(&p_pha_offset, 1, sizeof(float), file);
	fwrite(&p_pha_ramp, 1, sizeof(float), file);

	fwrite(&p_repeat_speed, 1, sizeof(float), file);

	fwrite(&p_arp_speed, 1, sizeof(float), file);
	fwrite(&p_arp_mod, 1, sizeof(float), file);

	fclose(file);
	return true;
}

void ResetSample(bool restart)
{
	if(!restart)
		phase=0;
	fperiod=100.0/(p_base_freq*p_base_freq+0.001);
	period=(int)fperiod;
	fmaxperiod=100.0/(p_freq_limit*p_freq_limit+0.001);
	fslide=1.0-pow((double)p_freq_ramp, 3.0)*0.01;
	fdslide=-pow((double)p_freq_dramp, 3.0)*0.000001;
	square_duty=0.5f-p_duty*0.5f;
	square_slide=-p_duty_ramp*0.00005f;
	if(p_arp_mod>=0.0f)
		arp_mod=1.0-pow((double)p_arp_mod, 2.0)*0.9;
	else
		arp_mod=1.0+pow((double)p_arp_mod, 2.0)*10.0;
	arp_time=0;
	arp_limit=(int)(pow(1.0f-p_arp_speed, 2.0f)*20000+32);
	if(p_arp_speed==1.0f)
		arp_limit=0;
	if(!restart)
	{
		// reset filter
		fltp=0.0f;
		fltdp=0.0f;
		fltw=pow(p_lpf_freq, 3.0f)*0.1f;
		fltw_d=1.0f+p_lpf_ramp*0.0001f;
		fltdmp=5.0f/(1.0f+pow(p_lpf_resonance, 2.0f)*20.0f)*(0.01f+fltw);
		if(fltdmp>0.8f) fltdmp=0.8f;
		fltphp=0.0f;
		flthp=pow(p_hpf_freq, 2.0f)*0.1f;
		flthp_d=1.0+p_hpf_ramp*0.0003f;
		// reset vibrato
		vib_phase=0.0f;
		vib_speed=pow(p_vib_speed, 2.0f)*0.01f;
		vib_amp=p_vib_strength*0.5f;
		// reset envelope
		env_vol=0.0f;
		env_stage=0;
		env_time=0;
		env_length[0]=(int)(p_env_attack*p_env_attack*100000.0f);
		env_length[1]=(int)(p_env_sustain*p_env_sustain*100000.0f);
		env_length[2]=(int)(p_env_decay*p_env_decay*100000.0f);

		fphase=pow(p_pha_offset, 2.0f)*1020.0f;
		if(p_pha_offset<0.0f) fphase=-fphase;
		fdphase=pow(p_pha_ramp, 2.0f)*1.0f;
		if(p_pha_ramp<0.0f) fdphase=-fdphase;
		iphase=abs((int)fphase);
		ipp=0;
		for(int i=0;i<1024;i++)
			phaser_buffer[i]=0.0f;

		for(int i=0;i<32;i++)
			noise_buffer[i]=frnd(2.0f)-1.0f;

		rep_time=0;
		rep_limit=(int)(pow(1.0f-p_repeat_speed, 2.0f)*20000+32);
		if(p_repeat_speed==0.0f)
			rep_limit=0;
	}
}

void PlaySample()
{
	ResetSample(false);
	playing_sample=true;
}

void SynthSample(int length, float* buffer, FILE* file)
{
	for(int i=0;i<length;i++)
	{
		if(!playing_sample)
			break;

		rep_time++;
		if(rep_limit!=0 && rep_time>=rep_limit)
		{
			rep_time=0;
			ResetSample(true);
		}

		// frequency envelopes/arpeggios
		arp_time++;
		if(arp_limit!=0 && arp_time>=arp_limit)
		{
			arp_limit=0;
			fperiod*=arp_mod;
		}
		fslide+=fdslide;
		fperiod*=fslide;
		if(fperiod>fmaxperiod)
		{
			fperiod=fmaxperiod;
			if(p_freq_limit>0.0f)
				playing_sample=false;
		}
		float rfperiod=fperiod;
		if(vib_amp>0.0f)
		{
			vib_phase+=vib_speed;
			rfperiod=fperiod*(1.0+sin(vib_phase)*vib_amp);
		}
		period=(int)rfperiod;
		if(period<8) period=8;
		square_duty+=square_slide;
		if(square_duty<0.0f) square_duty=0.0f;
		if(square_duty>0.5f) square_duty=0.5f;		
		// volume envelope
		env_time++;
		if(env_time>env_length[env_stage])
		{
			env_time=0;
			env_stage++;
			if(env_stage==3)
				playing_sample=false;
		}
		if(env_stage==0)
			env_vol=(float)env_time/env_length[0];
		if(env_stage==1)
			env_vol=1.0f+pow(1.0f-(float)env_time/env_length[1], 1.0f)*2.0f*p_env_punch;
		if(env_stage==2)
			env_vol=1.0f-(float)env_time/env_length[2];

		// phaser step
		fphase+=fdphase;
		iphase=abs((int)fphase);
		if(iphase>1023) iphase=1023;

		if(flthp_d!=0.0f)
		{
			flthp*=flthp_d;
			if(flthp<0.00001f) flthp=0.00001f;
			if(flthp>0.1f) flthp=0.1f;
		}

		float ssample=0.0f;
		for(int si=0;si<8;si++) // 8x supersampling
		{
			float sample=0.0f;
			phase++;
			if(phase>=period)
			{
//				phase=0;
				phase%=period;
				if(wave_type==3)
					for(int i=0;i<32;i++)
						noise_buffer[i]=frnd(2.0f)-1.0f;
			}
			// base waveform
			float fp=(float)phase/period;
			switch(wave_type)
			{
			case 0: // square
				if(fp<square_duty)
					sample=0.5f;
				else
					sample=-0.5f;
				break;
			case 1: // sawtooth
				sample=1.0f-fp*2;
				break;
			case 2: // sine
				sample=(float)sin(fp*2*PI);
				break;
			case 3: // noise
				sample=noise_buffer[phase*32/period];
				break;
			}
			// lp filter
			float pp=fltp;
			fltw*=fltw_d;
			if(fltw<0.0f) fltw=0.0f;
			if(fltw>0.1f) fltw=0.1f;
			if(p_lpf_freq!=1.0f)
			{
				fltdp+=(sample-fltp)*fltw;
				fltdp-=fltdp*fltdmp;
			}
			else
			{
				fltp=sample;
				fltdp=0.0f;
			}
			fltp+=fltdp;
			// hp filter
			fltphp+=fltp-pp;
			fltphp-=fltphp*flthp;
			sample=fltphp;
			// phaser
			phaser_buffer[ipp&1023]=sample;
			sample+=phaser_buffer[(ipp-iphase+1024)&1023];
			ipp=(ipp+1)&1023;
			// final accumulation and envelope application
			ssample+=sample*env_vol;
		}
		ssample=ssample/8*master_vol;

		ssample*=2.0f*sound_vol;

		if(buffer!=NULL)
		{
			if(ssample>1.0f) ssample=1.0f;
			if(ssample<-1.0f) ssample=-1.0f;
			*buffer++=ssample;
		}
		if(file!=NULL)
		{
			// quantize depending on format
			// accumulate/count to accomodate variable sample rate?
			ssample*=4.0f; // arbitrary gain to get reasonable output volume...
			if(ssample>1.0f) ssample=1.0f;
			if(ssample<-1.0f) ssample=-1.0f;
			filesample+=ssample;
			fileacc++;
			if(wav_freq==44100 || fileacc==2)
			{
				filesample/=fileacc;
				fileacc=0;
				if(wav_bits==16)
				{
					short isample=(short)(filesample*32000);
					fwrite(&isample, 1, 2, file);
				}
				else
				{
					unsigned char isample=(unsigned char)(filesample*127+128);
					fwrite(&isample, 1, 1, file);
				}
				filesample=0.0f;
			}
			file_sampleswritten++;
		}
	}
}

DPInput *input;
#ifdef WIN32
PortAudioStream *stream;
#endif
bool mute_stream;

#ifdef WIN32
//ancient portaudio stuff
static int AudioCallback(void *inputBuffer, void *outputBuffer,
						 unsigned long framesPerBuffer,
						 PaTimestamp outTime, void *userData)
{
	float *out=(float*)outputBuffer;
	float *in=(float*)inputBuffer;
	(void)outTime;

	if(playing_sample && !mute_stream)
		SynthSample(framesPerBuffer, out, NULL);
	else
		for(int i=0;i<framesPerBuffer;i++)
			*out++=0.0f;
	
	return 0;
}
#else
//lets use SDL in stead
static void SDLAudioCallback(void *userdata, Uint8 *stream, int len)
{
	if (playing_sample && !mute_stream)
	{
		unsigned int l = len/2;
		float fbuf[l];
		memset(fbuf, 0, sizeof(fbuf));
		SynthSample(l, fbuf, NULL);
		while (l--)
		{
			float f = fbuf[l];
			if (f < -1.0) f = -1.0;
			if (f > 1.0) f = 1.0;
			((Sint16*)stream)[l] = (Sint16)(f * 32767);
		}
	}
	else memset(stream, 0, len);
}
#endif

bool ExportWAV(char* filename)
{
	FILE* foutput=fopen(filename, "wb");
	if(!foutput)
		return false;
	// write wav header
	char string[32];
	unsigned int dword=0;
	unsigned short word=0;
	fwrite("RIFF", 4, 1, foutput); // "RIFF"
	dword=0;
	fwrite(&dword, 1, 4, foutput); // remaining file size
	fwrite("WAVE", 4, 1, foutput); // "WAVE"

	fwrite("fmt ", 4, 1, foutput); // "fmt "
	dword=16;
	fwrite(&dword, 1, 4, foutput); // chunk size
	word=1;
	fwrite(&word, 1, 2, foutput); // compression code
	word=1;
	fwrite(&word, 1, 2, foutput); // channels
	dword=wav_freq;
	fwrite(&dword, 1, 4, foutput); // sample rate
	dword=wav_freq*wav_bits/8;
	fwrite(&dword, 1, 4, foutput); // bytes/sec
	word=wav_bits/8;
	fwrite(&word, 1, 2, foutput); // block align
	word=wav_bits;
	fwrite(&word, 1, 2, foutput); // bits per sample

	fwrite("data", 4, 1, foutput); // "data"
	dword=0;
	int foutstream_datasize=ftell(foutput);
	fwrite(&dword, 1, 4, foutput); // chunk size

	// write sample data
	mute_stream=true;
	file_sampleswritten=0;
	filesample=0.0f;
	fileacc=0;
	PlaySample();
	while(playing_sample)
		SynthSample(256, NULL, foutput);
	mute_stream=false;

	// seek back to header and write size info
	fseek(foutput, 4, SEEK_SET);
	dword=0;
	dword=foutstream_datasize-4+file_sampleswritten*wav_bits/8;
	fwrite(&dword, 1, 4, foutput); // remaining file size
	fseek(foutput, foutstream_datasize, SEEK_SET);
	dword=file_sampleswritten*wav_bits/8;
	fwrite(&dword, 1, 4, foutput); // chunk size (data)
	fclose(foutput);
	
	return true;
}

#include "tools.h"

bool firstframe=true;
int refresh_counter=0;

void Slider(int x, int y, float& value, bool bipolar, const char* text)
{
	if(MouseInBox(x, y, 100, 10))
	{
		if(mouse_leftclick)
			vselected=&value;
		if(mouse_rightclick)
			value=0.0f;
	}
	float mv=(float)(mouse_x-mouse_px);
	if(vselected!=&value)
		mv=0.0f;
	if(bipolar)
	{
		value+=mv*0.005f;
		if(value<-1.0f) value=-1.0f;
		if(value>1.0f) value=1.0f;
	}
	else
	{
		value+=mv*0.0025f;
		if(value<0.0f) value=0.0f;
		if(value>1.0f) value=1.0f;
	}
	DrawBar(x-1, y, 102, 10, 0x000000);
	int ival=(int)(value*99);
	if(bipolar)
		ival=(int)(value*49.5f+49.5f);
	DrawBar(x, y+1, ival, 8, 0xF0C090);
	DrawBar(x+ival, y+1, 100-ival, 8, 0x807060);
	DrawBar(x+ival, y+1, 1, 8, 0xFFFFFF);
	if(bipolar)
	{
		DrawBar(x+50, y-1, 1, 3, 0x000000);
		DrawBar(x+50, y+8, 1, 3, 0x000000);
	}
	DWORD tcol=0x000000;
	if(wave_type!=0 && (&value==&p_duty || &value==&p_duty_ramp))
		tcol=0x808080;
	DrawText(x-4-strlen(text)*8, y+1, tcol, text);
}

bool Button(int x, int y, bool highlight, const char* text, int id)
{
	DWORD color1=0x000000;
	DWORD color2=0xA09088;
	DWORD color3=0x000000;
	bool hover=MouseInBox(x, y, 100, 17);
	if(hover && mouse_leftclick)
		vcurbutton=id;
	bool current=(vcurbutton==id);
	if(highlight)
	{
		color1=0x000000;
		color2=0x988070;
		color3=0xFFF0E0;
	}
	if(current && hover)
	{
		color1=0xA09088;
		color2=0xFFF0E0;
		color3=0xA09088;
	}
	DrawBar(x-1, y-1, 102, 19, color1);
	DrawBar(x, y, 100, 17, color2);
	DrawText(x+5, y+5, color3, text);
	if(current && hover && !mouse_left)
		return true;
	return false;
}

int drawcount=0;

void DrawScreen()
{
	bool redraw=true;
	if(!firstframe && mouse_x-mouse_px==0 && mouse_y-mouse_py==0 && !mouse_left && !mouse_right)
		redraw=false;
	if(!mouse_left)
	{
		if(vselected!=NULL || vcurbutton>-1)
		{
			redraw=true;
			refresh_counter=2;
		}
		vselected=NULL;
	}
	if(refresh_counter>0)
	{
		refresh_counter--;
		redraw=true;
	}

	if(playing_sample)
		redraw=true;

	if(drawcount++>20)
	{
		redraw=true;
		drawcount=0;
	}

	if(!redraw)
		return;

	firstframe=false;

	ddkLock();

	ClearScreen(0xC0B090);

	DrawText(10, 10, 0x504030, "GENERATOR");
	for(int i=0;i<7;i++)
	{
		if(Button(5, 35+i*30, false, categories[i].name, 300+i))
		{
			switch(i)
			{
			case 0: // pickup/coin
				ResetParams();
				p_base_freq=0.4f+frnd(0.5f);
				p_env_attack=0.0f;
				p_env_sustain=frnd(0.1f);
				p_env_decay=0.1f+frnd(0.4f);
				p_env_punch=0.3f+frnd(0.3f);
				if(rnd(1))
				{
					p_arp_speed=0.5f+frnd(0.2f);
					p_arp_mod=0.2f+frnd(0.4f);
				}
				break;
			case 1: // laser/shoot
				ResetParams();
				wave_type=rnd(2);
				if(wave_type==2 && rnd(1))
					wave_type=rnd(1);
				p_base_freq=0.5f+frnd(0.5f);
				p_freq_limit=p_base_freq-0.2f-frnd(0.6f);
				if(p_freq_limit<0.2f) p_freq_limit=0.2f;
				p_freq_ramp=-0.15f-frnd(0.2f);
				if(rnd(2)==0)
				{
					p_base_freq=0.3f+frnd(0.6f);
					p_freq_limit=frnd(0.1f);
					p_freq_ramp=-0.35f-frnd(0.3f);
				}
				if(rnd(1))
				{
					p_duty=frnd(0.5f);
					p_duty_ramp=frnd(0.2f);
				}
				else
				{
					p_duty=0.4f+frnd(0.5f);
					p_duty_ramp=-frnd(0.7f);
				}
				p_env_attack=0.0f;
				p_env_sustain=0.1f+frnd(0.2f);
				p_env_decay=frnd(0.4f);
				if(rnd(1))
					p_env_punch=frnd(0.3f);
				if(rnd(2)==0)
				{
					p_pha_offset=frnd(0.2f);
					p_pha_ramp=-frnd(0.2f);
				}
				if(rnd(1))
					p_hpf_freq=frnd(0.3f);
				break;
			case 2: // explosion
				ResetParams();
				wave_type=3;
				if(rnd(1))
				{
					p_base_freq=0.1f+frnd(0.4f);
					p_freq_ramp=-0.1f+frnd(0.4f);
				}
				else
				{
					p_base_freq=0.2f+frnd(0.7f);
					p_freq_ramp=-0.2f-frnd(0.2f);
				}
				p_base_freq*=p_base_freq;
				if(rnd(4)==0)
					p_freq_ramp=0.0f;
				if(rnd(2)==0)
					p_repeat_speed=0.3f+frnd(0.5f);
				p_env_attack=0.0f;
				p_env_sustain=0.1f+frnd(0.3f);
				p_env_decay=frnd(0.5f);
				if(rnd(1)==0)
				{
					p_pha_offset=-0.3f+frnd(0.9f);
					p_pha_ramp=-frnd(0.3f);
				}
				p_env_punch=0.2f+frnd(0.6f);
				if(rnd(1))
				{
					p_vib_strength=frnd(0.7f);
					p_vib_speed=frnd(0.6f);
				}
				if(rnd(2)==0)
				{
					p_arp_speed=0.6f+frnd(0.3f);
					p_arp_mod=0.8f-frnd(1.6f);
				}
				break;
			case 3: // powerup
				ResetParams();
				if(rnd(1))
					wave_type=1;
				else
					p_duty=frnd(0.6f);
				if(rnd(1))
				{
					p_base_freq=0.2f+frnd(0.3f);
					p_freq_ramp=0.1f+frnd(0.4f);
					p_repeat_speed=0.4f+frnd(0.4f);
				}
				else
				{
					p_base_freq=0.2f+frnd(0.3f);
					p_freq_ramp=0.05f+frnd(0.2f);
					if(rnd(1))
					{
						p_vib_strength=frnd(0.7f);
						p_vib_speed=frnd(0.6f);
					}
				}
				p_env_attack=0.0f;
				p_env_sustain=frnd(0.4f);
				p_env_decay=0.1f+frnd(0.4f);
				break;
			case 4: // hit/hurt
				ResetParams();
				wave_type=rnd(2);
				if(wave_type==2)
					wave_type=3;
				if(wave_type==0)
					p_duty=frnd(0.6f);
				p_base_freq=0.2f+frnd(0.6f);
				p_freq_ramp=-0.3f-frnd(0.4f);
				p_env_attack=0.0f;
				p_env_sustain=frnd(0.1f);
				p_env_decay=0.1f+frnd(0.2f);
				if(rnd(1))
					p_hpf_freq=frnd(0.3f);
				break;
			case 5: // jump
				ResetParams();
				wave_type=0;
				p_duty=frnd(0.6f);
				p_base_freq=0.3f+frnd(0.3f);
				p_freq_ramp=0.1f+frnd(0.2f);
				p_env_attack=0.0f;
				p_env_sustain=0.1f+frnd(0.3f);
				p_env_decay=0.1f+frnd(0.2f);
				if(rnd(1))
					p_hpf_freq=frnd(0.3f);
				if(rnd(1))
					p_lpf_freq=1.0f-frnd(0.6f);
				break;
			case 6: // blip/select
				ResetParams();
				wave_type=rnd(1);
				if(wave_type==0)
					p_duty=frnd(0.6f);
				p_base_freq=0.2f+frnd(0.4f);
				p_env_attack=0.0f;
				p_env_sustain=0.1f+frnd(0.1f);
				p_env_decay=frnd(0.2f);
				p_hpf_freq=0.1f;
				break;
			default:
				break;
			}

			PlaySample();
		}
	}
	DrawBar(110, 0, 2, 480, 0x000000);
	DrawText(120, 10, 0x504030, "MANUAL SETTINGS");
	DrawSprite(ld48, 8, 440, 0, 0xB0A080);

	if(Button(130, 30, wave_type==0, "SQUAREWAVE", 10))
		wave_type=0;
	if(Button(250, 30, wave_type==1, "SAWTOOTH", 11))
		wave_type=1;
	if(Button(370, 30, wave_type==2, "SINEWAVE", 12))
		wave_type=2;
	if(Button(490, 30, wave_type==3, "NOISE", 13))
		wave_type=3;

	bool do_play=false;

	DrawBar(5-1-1, 412-1-1, 102+2, 19+2, 0x000000);
	if(Button(5, 412, false, "RANDOMIZE", 40))
	{
		p_base_freq=pow(frnd(2.0f)-1.0f, 2.0f);
		if(rnd(1))
			p_base_freq=pow(frnd(2.0f)-1.0f, 3.0f)+0.5f;
		p_freq_limit=0.0f;
		p_freq_ramp=pow(frnd(2.0f)-1.0f, 5.0f);
		if(p_base_freq>0.7f && p_freq_ramp>0.2f)
			p_freq_ramp=-p_freq_ramp;
		if(p_base_freq<0.2f && p_freq_ramp<-0.05f)
			p_freq_ramp=-p_freq_ramp;
		p_freq_dramp=pow(frnd(2.0f)-1.0f, 3.0f);
		p_duty=frnd(2.0f)-1.0f;
		p_duty_ramp=pow(frnd(2.0f)-1.0f, 3.0f);
		p_vib_strength=pow(frnd(2.0f)-1.0f, 3.0f);
		p_vib_speed=frnd(2.0f)-1.0f;
		p_vib_delay=frnd(2.0f)-1.0f;
		p_env_attack=pow(frnd(2.0f)-1.0f, 3.0f);
		p_env_sustain=pow(frnd(2.0f)-1.0f, 2.0f);
		p_env_decay=frnd(2.0f)-1.0f;
		p_env_punch=pow(frnd(0.8f), 2.0f);
		if(p_env_attack+p_env_sustain+p_env_decay<0.2f)
		{
			p_env_sustain+=0.2f+frnd(0.3f);
			p_env_decay+=0.2f+frnd(0.3f);
		}
		p_lpf_resonance=frnd(2.0f)-1.0f;
		p_lpf_freq=1.0f-pow(frnd(1.0f), 3.0f);
		p_lpf_ramp=pow(frnd(2.0f)-1.0f, 3.0f);
		if(p_lpf_freq<0.1f && p_lpf_ramp<-0.05f)
			p_lpf_ramp=-p_lpf_ramp;
		p_hpf_freq=pow(frnd(1.0f), 5.0f);
		p_hpf_ramp=pow(frnd(2.0f)-1.0f, 5.0f);
		p_pha_offset=pow(frnd(2.0f)-1.0f, 3.0f);
		p_pha_ramp=pow(frnd(2.0f)-1.0f, 3.0f);
		p_repeat_speed=frnd(2.0f)-1.0f;
		p_arp_speed=frnd(2.0f)-1.0f;
		p_arp_mod=frnd(2.0f)-1.0f;
		do_play=true;
	}

	if(Button(5, 382, false, "MUTATE", 30))
	{
		if(rnd(1)) p_base_freq+=frnd(0.1f)-0.05f;
//		if(rnd(1)) p_freq_limit+=frnd(0.1f)-0.05f;
		if(rnd(1)) p_freq_ramp+=frnd(0.1f)-0.05f;
		if(rnd(1)) p_freq_dramp+=frnd(0.1f)-0.05f;
		if(rnd(1)) p_duty+=frnd(0.1f)-0.05f;
		if(rnd(1)) p_duty_ramp+=frnd(0.1f)-0.05f;
		if(rnd(1)) p_vib_strength+=frnd(0.1f)-0.05f;
		if(rnd(1)) p_vib_speed+=frnd(0.1f)-0.05f;
		if(rnd(1)) p_vib_delay+=frnd(0.1f)-0.05f;
		if(rnd(1)) p_env_attack+=frnd(0.1f)-0.05f;
		if(rnd(1)) p_env_sustain+=frnd(0.1f)-0.05f;
		if(rnd(1)) p_env_decay+=frnd(0.1f)-0.05f;
		if(rnd(1)) p_env_punch+=frnd(0.1f)-0.05f;
		if(rnd(1)) p_lpf_resonance+=frnd(0.1f)-0.05f;
		if(rnd(1)) p_lpf_freq+=frnd(0.1f)-0.05f;
		if(rnd(1)) p_lpf_ramp+=frnd(0.1f)-0.05f;
		if(rnd(1)) p_hpf_freq+=frnd(0.1f)-0.05f;
		if(rnd(1)) p_hpf_ramp+=frnd(0.1f)-0.05f;
		if(rnd(1)) p_pha_offset+=frnd(0.1f)-0.05f;
		if(rnd(1)) p_pha_ramp+=frnd(0.1f)-0.05f;
		if(rnd(1)) p_repeat_speed+=frnd(0.1f)-0.05f;
		if(rnd(1)) p_arp_speed+=frnd(0.1f)-0.05f;
		if(rnd(1)) p_arp_mod+=frnd(0.1f)-0.05f;
		do_play=true;
	}

	DrawText(515, 170, 0x000000, "VOLUME");
	DrawBar(490-1-1+60, 180-1+5, 70, 2, 0x000000);
	DrawBar(490-1-1+60+68, 180-1+5, 2, 205, 0x000000);
	DrawBar(490-1-1+60, 180-1, 42+2, 10+2, 0xFF0000);
	Slider(490, 180, sound_vol, false, " ");
	if(Button(490, 200, false, "PLAY SOUND", 20))
		PlaySample();

	if(Button(490, 290, false, "LOAD SOUND", 14))
	{
		char filename[256];
		if(FileSelectorLoad(hWndMain, filename, 1)) // WIN32
		{
			ResetParams();
			LoadSettings(filename);
			PlaySample();
		}
	}
	if(Button(490, 320, false, "SAVE SOUND", 15))
	{
		char filename[256];
		if(FileSelectorSave(hWndMain, filename, 1)) // WIN32
			SaveSettings(filename);
	}

	DrawBar(490-1-1+60, 380-1+9, 70, 2, 0x000000);
	DrawBar(490-1-2, 380-1-2, 102+4, 19+4, 0x000000);
	if(Button(490, 380, false, "EXPORT .WAV", 16))
	{
		char filename[256];
		if(FileSelectorSave(hWndMain, filename, 0)) // WIN32
			ExportWAV(filename);
	}
	char str[10];
	sprintf(str, "%i HZ", wav_freq);
	if(Button(490, 410, false, str, 18))
	{
		if(wav_freq==44100)
			wav_freq=22050;
		else
			wav_freq=44100;
	}
	sprintf(str, "%i-BIT", wav_bits);
	if(Button(490, 440, false, str, 19))
	{
		if(wav_bits==16)
			wav_bits=8;
		else
			wav_bits=16;
	}

	int ypos=4;

	int xpos=350;

	DrawBar(xpos-190, ypos*18-5, 300, 2, 0x0000000);

	Slider(xpos, (ypos++)*18, p_env_attack, false, "ATTACK TIME");
	Slider(xpos, (ypos++)*18, p_env_sustain, false, "SUSTAIN TIME");
	Slider(xpos, (ypos++)*18, p_env_punch, false, "SUSTAIN PUNCH");
	Slider(xpos, (ypos++)*18, p_env_decay, false, "DECAY TIME");

	DrawBar(xpos-190, ypos*18-5, 300, 2, 0x0000000);

	Slider(xpos, (ypos++)*18, p_base_freq, false, "START FREQUENCY");
	Slider(xpos, (ypos++)*18, p_freq_limit, false, "MIN FREQUENCY");
	Slider(xpos, (ypos++)*18, p_freq_ramp, true, "SLIDE");
	Slider(xpos, (ypos++)*18, p_freq_dramp, true, "DELTA SLIDE");

	Slider(xpos, (ypos++)*18, p_vib_strength, false, "VIBRATO DEPTH");
	Slider(xpos, (ypos++)*18, p_vib_speed, false, "VIBRATO SPEED");

	DrawBar(xpos-190, ypos*18-5, 300, 2, 0x0000000);

	Slider(xpos, (ypos++)*18, p_arp_mod, true, "CHANGE AMOUNT");
	Slider(xpos, (ypos++)*18, p_arp_speed, false, "CHANGE SPEED");

	DrawBar(xpos-190, ypos*18-5, 300, 2, 0x0000000);

	Slider(xpos, (ypos++)*18, p_duty, false, "SQUARE DUTY");
	Slider(xpos, (ypos++)*18, p_duty_ramp, true, "DUTY SWEEP");

	DrawBar(xpos-190, ypos*18-5, 300, 2, 0x0000000);

	Slider(xpos, (ypos++)*18, p_repeat_speed, false, "REPEAT SPEED");

	DrawBar(xpos-190, ypos*18-5, 300, 2, 0x0000000);

	Slider(xpos, (ypos++)*18, p_pha_offset, true, "PHASER OFFSET");
	Slider(xpos, (ypos++)*18, p_pha_ramp, true, "PHASER SWEEP");

	DrawBar(xpos-190, ypos*18-5, 300, 2, 0x0000000);

	Slider(xpos, (ypos++)*18, p_lpf_freq, false, "LP FILTER CUTOFF");
	Slider(xpos, (ypos++)*18, p_lpf_ramp, true, "LP FILTER CUTOFF SWEEP");
	Slider(xpos, (ypos++)*18, p_lpf_resonance, false, "LP FILTER RESONANCE");
	Slider(xpos, (ypos++)*18, p_hpf_freq, false, "HP FILTER CUTOFF");
	Slider(xpos, (ypos++)*18, p_hpf_ramp, true, "HP FILTER CUTOFF SWEEP");

	DrawBar(xpos-190, ypos*18-5, 300, 2, 0x0000000);

	DrawBar(xpos-190, 4*18-5, 1, (ypos-4)*18, 0x0000000);
	DrawBar(xpos-190+299, 4*18-5, 1, (ypos-4)*18, 0x0000000);

	if(do_play)
		PlaySample();

	ddkUnlock();

	if(!mouse_left)
		vcurbutton=-1;
}

bool keydown=false;

bool ddkCalcFrame()
{
	input->Update(); // WIN32 (for keyboard input)

	if(input->KeyPressed(DIK_SPACE) || input->KeyPressed(DIK_RETURN)) // WIN32 (keyboard input only for convenience, ok to remove)
	{
		if(!keydown)
		{
			PlaySample();
			keydown=true;
		}
	}
	else
		keydown=false;

	DrawScreen();

	Sleep(5); // WIN32
	return true;
}

void ddkInit()
{
	srand(time(NULL));

	ddkSetMode(640,480, 32, 60, DDK_WINDOW, "sfxr"); // requests window size etc from ddrawkit

	if (LoadTGA(font, "/usr/share/sfxr/font.tga")) {
        	/* Try again in cwd */
		if (LoadTGA(font, "font.tga")) {
			fprintf(stderr,
				"Error could not open /usr/share/sfxr/font.tga"
				" nor font.tga\n");
			exit(1);
		}
	}

	if (LoadTGA(ld48, "/usr/share/sfxr/ld48.tga")) {
        	/* Try again in cwd */
		if (LoadTGA(ld48, "ld48.tga")) {
			fprintf(stderr,
				"Error could not open /usr/share/sfxr/ld48.tga"
				" nor ld48.tga\n");
			exit(1);
		}
	}

	ld48.width=ld48.pitch;

	input=new DPInput(hWndMain, hInstanceMain); // WIN32

	strcpy(categories[0].name, "PICKUP/COIN");
	strcpy(categories[1].name, "LASER/SHOOT");
	strcpy(categories[2].name, "EXPLOSION");
	strcpy(categories[3].name, "POWERUP");
	strcpy(categories[4].name, "HIT/HURT");
	strcpy(categories[5].name, "JUMP");
	strcpy(categories[6].name, "BLIP/SELECT");

	ResetParams();

#ifdef WIN32
	// Init PortAudio
	SetEnvironmentVariable("PA_MIN_LATENCY_MSEC", "75"); // WIN32
	Pa_Initialize();
	Pa_OpenDefaultStream(
				&stream,
				0,
				1,
				paFloat32,	// output type
				44100,
				512,		// samples per buffer
				0,			// # of buffers
				AudioCallback,
				NULL);
	Pa_StartStream(stream);
#else
	SDL_AudioSpec des;
	des.freq = 44100;
	des.format = AUDIO_S16SYS;
	des.channels = 1;
	des.samples = 512;
	des.callback = SDLAudioCallback;
	des.userdata = NULL;
	VERIFY(!SDL_OpenAudio(&des, NULL));
	SDL_PauseAudio(0);
#endif
}

void ddkFree()
{
	delete input;
	free(ld48.data);
	free(font.data);
	
#ifdef WIN32
	// Close PortAudio
    Pa_StopStream(stream);
    Pa_CloseStream(stream);
    Pa_Terminate();
#endif
}

