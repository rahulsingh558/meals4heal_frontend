import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatWidgetComponent } from '../../components/chat/chat.component';

@Component({
  selector: 'app-help',
  standalone: true,
  imports: [CommonModule, ChatWidgetComponent],
  templateUrl: './help.html',
  styleUrls: ['./help.css']
})
export class Help {
}
