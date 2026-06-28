import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Product } from '../../../core/models';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.css'
})
export class ProductCardComponent {
  @Input({ required: true }) product!: Product;
  @Input() showAddButton = true;
  @Input() quantity = 0;
  @Output() add    = new EventEmitter<Product>();
  @Output() remove = new EventEmitter<Product>();
}
